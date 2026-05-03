import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, rateCardsTable, usersTable, categoriesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const RateCardBody = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  maxRatePerProject: z.number().optional(),
  maxRatePerHour: z.number().optional(),
  empanelledVendorIds: z.array(z.string().uuid()).optional(),
  notes: z.string().optional(),
});

function isEnterprise(role: string) {
  return role === "enterprise_buyer" || role === "buyer" || role === "both";
}

router.get("/enterprise/rate-cards", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !isEnterprise(user.role)) { res.status(403).json({ error: "Enterprise buyers only" }); return; }

  const cards = await db.select({
    id: rateCardsTable.id,
    name: rateCardsTable.name,
    categoryId: rateCardsTable.categoryId,
    maxRatePerProject: rateCardsTable.maxRatePerProject,
    maxRatePerHour: rateCardsTable.maxRatePerHour,
    empanelledVendorIds: rateCardsTable.empanelledVendorIds,
    isActive: rateCardsTable.isActive,
    notes: rateCardsTable.notes,
    createdAt: rateCardsTable.createdAt,
    categoryName: categoriesTable.name,
  }).from(rateCardsTable)
    .leftJoin(categoriesTable, eq(rateCardsTable.categoryId, categoriesTable.id))
    .where(eq(rateCardsTable.enterpriseBuyerId, user.id));

  res.json(cards.map(c => ({
    ...c,
    maxRatePerProject: c.maxRatePerProject ? Number(c.maxRatePerProject) : null,
    maxRatePerHour: c.maxRatePerHour ? Number(c.maxRatePerHour) : null,
    empanelledVendorIds: Array.isArray(c.empanelledVendorIds) ? c.empanelledVendorIds : [],
    createdAt: c.createdAt.toISOString(),
  })));
});

router.post("/enterprise/rate-cards", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !isEnterprise(user.role)) { res.status(403).json({ error: "Enterprise buyers only" }); return; }

  const parsed = RateCardBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [card] = await db.insert(rateCardsTable).values({
    enterpriseBuyerId: user.id,
    categoryId: parsed.data.categoryId ?? null,
    name: parsed.data.name,
    maxRatePerProject: parsed.data.maxRatePerProject ? String(parsed.data.maxRatePerProject) : null,
    maxRatePerHour: parsed.data.maxRatePerHour ? String(parsed.data.maxRatePerHour) : null,
    empanelledVendorIds: parsed.data.empanelledVendorIds ?? [],
    notes: parsed.data.notes ?? null,
  }).returning();

  res.status(201).json({
    ...card,
    maxRatePerProject: card.maxRatePerProject ? Number(card.maxRatePerProject) : null,
    maxRatePerHour: card.maxRatePerHour ? Number(card.maxRatePerHour) : null,
    empanelledVendorIds: Array.isArray(card.empanelledVendorIds) ? card.empanelledVendorIds : [],
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  });
});

router.put("/enterprise/rate-cards/:id", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !isEnterprise(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  const parsed = RateCardBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const updates: Partial<typeof rateCardsTable.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.categoryId !== undefined) updates.categoryId = parsed.data.categoryId;
  if (parsed.data.maxRatePerProject !== undefined) updates.maxRatePerProject = String(parsed.data.maxRatePerProject);
  if (parsed.data.maxRatePerHour !== undefined) updates.maxRatePerHour = String(parsed.data.maxRatePerHour);
  if (parsed.data.empanelledVendorIds !== undefined) updates.empanelledVendorIds = parsed.data.empanelledVendorIds;
  if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;

  const [updated] = await db.update(rateCardsTable)
    .set(updates)
    .where(and(eq(rateCardsTable.id, String(req.params.id)), eq(rateCardsTable.enterpriseBuyerId, user.id)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Rate card not found" }); return; }
  res.json({ ...updated, maxRatePerProject: Number(updated.maxRatePerProject ?? 0), maxRatePerHour: Number(updated.maxRatePerHour ?? 0), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

router.delete("/enterprise/rate-cards/:id", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user || !isEnterprise(user.role)) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(rateCardsTable).where(and(eq(rateCardsTable.id, String(req.params.id)), eq(rateCardsTable.enterpriseBuyerId, user.id)));
  res.json({ ok: true });
});

export default router;
