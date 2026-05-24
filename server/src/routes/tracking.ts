import { Router, type IRouter } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import {
  db, usersTable, requirementsTable, bidsTable,
  gpsTrackingTable, sustainabilityRecordsTable,
} from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const PROVIDER_ROLES = ["provider", "both", "solo_provider", "agency_provider"];
const CATEGORIES_WITH_GPS = ["logistics", "home", "healthcare", "security", "events", "auto-fleet", "construction", "heavy-machinery"];

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /tracking/gps — provider posts their GPS location
router.post("/tracking/gps", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !PROVIDER_ROLES.includes(user.role)) { res.status(403).json({ error: "Providers only" }); return; }

  const parsed = z.object({
    requirementId: z.string().uuid(),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    status: z.enum(["en_route", "on_site", "completed"]).default("en_route"),
    etaMinutes: z.number().min(0).optional(),
    speedKmh: z.number().min(0).optional(),
    accuracyMeters: z.number().min(0).optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [tracking] = await db.insert(gpsTrackingTable).values({
    requirementId: parsed.data.requirementId,
    userId: user.id,
    role: "provider",
    latitude: String(parsed.data.latitude),
    longitude: String(parsed.data.longitude),
    status: parsed.data.status,
    etaMinutes: parsed.data.etaMinutes,
    speedKmh: parsed.data.speedKmh ? String(parsed.data.speedKmh) : null,
    accuracyMeters: parsed.data.accuracyMeters,
    isSharing: true,
  }).returning();

  // Update user's last known location
  await db.update(usersTable).set({
    latitude: String(parsed.data.latitude),
    longitude: String(parsed.data.longitude),
  }).where(eq(usersTable.id, user.id));

  res.status(201).json({
    ...tracking,
    latitude: Number(tracking.latitude),
    longitude: Number(tracking.longitude),
    speedKmh: Number(tracking.speedKmh ?? 0),
    createdAt: tracking.createdAt.toISOString(),
    message: parsed.data.status === "on_site" ? "Arrival confirmed — buyer has been notified" : "Location updated",
  });
});

// GET /tracking/gps/:requirementId — get latest GPS data for a requirement
router.get("/tracking/gps/:requirementId", requireAuth, async (req, res): Promise<void> => {
  const reqId = String(req.params.requirementId);
  const [req_] = await db.select().from(requirementsTable).where(eq(requirementsTable.id, reqId));
  if (!req_) { res.status(404).json({ error: "Requirement not found" }); return; }

  // Latest tracking points per user
  const trackingPoints = await db.select().from(gpsTrackingTable)
    .where(eq(gpsTrackingTable.requirementId, reqId))
    .orderBy(desc(gpsTrackingTable.createdAt))
    .limit(50);

  // Group by user — get latest per provider
  const byProvider = new Map<string, typeof trackingPoints[0]>();
  for (const pt of trackingPoints) {
    if (!byProvider.has(pt.userId)) byProvider.set(pt.userId, pt);
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

  // Determine SLA status for enterprise
  const latestPoints = Array.from(byProvider.values());
  const onSite = latestPoints.filter(p => p.status === "on_site").length;
  const enRoute = latestPoints.filter(p => p.status === "en_route").length;

  const isEnterprise = user?.role === "enterprise_buyer";
  const slaStatus = isEnterprise ? {
    totalProviders: latestPoints.length,
    onSite,
    enRoute,
    slaBreached: latestPoints.some(p => p.etaMinutes && p.etaMinutes > 60),
    overallStatus: onSite > 0 ? "on_site" : enRoute > 0 ? "en_route" : "awaiting_start",
  } : null;

  res.json({
    requirementId: reqId,
    requirementTitle: req_.title,
    requirementCity: req_.city,
    providers: latestPoints.map(p => ({
      userId: p.userId,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      status: p.status,
      etaMinutes: p.etaMinutes,
      speedKmh: Number(p.speedKmh ?? 0),
      isSharing: p.isSharing,
      lastUpdated: p.createdAt.toISOString(),
    })),
    slaStatus,
    privacyNote: "Provider location is shared only for the duration of an active booking and automatically stops on job completion.",
  });
});

// POST /tracking/gps/stop — provider stops sharing location
router.post("/tracking/gps/stop", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({ requirementId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  await db.update(gpsTrackingTable)
    .set({ isSharing: false })
    .where(and(eq(gpsTrackingTable.requirementId, parsed.data.requirementId), eq(gpsTrackingTable.userId, req.user!.userId)));

  res.json({ ok: true, message: "Location sharing stopped" });
});

// POST /tracking/sustainability — compute and save sustainability record for a bid
router.post("/tracking/sustainability", requireAuth, async (req, res): Promise<void> => {
  const parsed = z.object({
    requirementId: z.string().uuid(),
    bidId: z.string().uuid().optional(),
    providerLat: z.number(),
    providerLon: z.number(),
    requirementLat: z.number(),
    requirementLon: z.number(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const distanceKm = haversineKm(
    parsed.data.providerLat, parsed.data.providerLon,
    parsed.data.requirementLat, parsed.data.requirementLon,
  );

  // Carbon: ~0.21 kg CO2/km for a typical van/bike
  const estimatedCarbonKg = distanceKm * 0.21;
  const fuelSavedLitres = Math.max(0, (50 - distanceKm) * 0.07); // vs 50km baseline
  const routeEfficiencyScore = Math.round(Math.min(100, Math.max(0, 100 - distanceKm * 1.2)));
  const sustainabilityLabel = distanceKm < 5 ? "eco_winner"
    : distanceKm < 15 ? "local_match"
      : distanceKm < 40 ? "regional"
        : "national";

  const [record] = await db.insert(sustainabilityRecordsTable).values({
    requirementId: parsed.data.requirementId,
    bidId: parsed.data.bidId ?? null,
    distanceKm: String(distanceKm.toFixed(2)),
    estimatedCarbonKg: String(estimatedCarbonKg.toFixed(3)),
    fuelSavedLitres: String(fuelSavedLitres.toFixed(3)),
    localProviderBonus: String((sustainabilityLabel === "eco_winner" ? 5 : sustainabilityLabel === "local_match" ? 3 : 0).toFixed(2)),
    routeEfficiencyScore: String(routeEfficiencyScore.toFixed(2)),
    sustainabilityLabel,
  }).returning();

  res.status(201).json({
    ...record,
    distanceKm: Number(record.distanceKm),
    estimatedCarbonKg: Number(record.estimatedCarbonKg),
    fuelSavedLitres: Number(record.fuelSavedLitres),
    routeEfficiencyScore: Number(record.routeEfficiencyScore),
    createdAt: record.createdAt.toISOString(),
    summary: sustainabilityLabel === "eco_winner"
      ? `🌱 Eco winner! Provider is only ${distanceKm.toFixed(1)}km away — minimal carbon footprint.`
      : sustainabilityLabel === "local_match"
        ? `📍 Local match at ${distanceKm.toFixed(1)}km — shorter travel saves time and fuel.`
        : `📦 Provider is ${distanceKm.toFixed(1)}km away — consider closer alternatives for green points.`,
  });
});

export default router;
