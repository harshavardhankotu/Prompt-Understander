import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable, usersTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const DEFAULT_SETTINGS: Record<string, object> = {
  retail_buyer: {
    notifications: { newBidEmail: true, newBidSMS: false, newBidWhatsApp: true, bidAcceptedEmail: true, requirementExpiredEmail: true, disputeUpdateEmail: true },
    preferences: { defaultCity: "", defaultState: "", language: "en", savedLocations: [], autoInvitePreviousProvider: false, contactSyncPermission: false },
    payment: { defaultUpiId: "", preferredPaymentMethod: "upi", autoEscrowRelease: false },
    privacy: { showContactToBidders: false, showProfileToProviders: true },
    recurring: { defaultDeadlineHours: 24, autoRepostOnExpiry: false },
  },
  enterprise_buyer: {
    notifications: { rfpActivityEmail: true, vendorResponseEmail: true, invoiceReadyEmail: true, disputeUpdateEmail: true },
    company: { gstNumber: "", panNumber: "", cinNumber: "", authorizedSignatory: "", billingEmail: "" },
    procurement: { twoEnvelopeByDefault: true, rateCeilingEnabled: true, approvalRequired: false, approverEmails: [], privateRfpByDefault: false },
    empanelment: { autoInviteEmpanelled: true, minVendorRating: 4.0, minVendorOmniScore: 50 },
    analytics: { accessLevel: "full", exportEnabled: true, teamEmails: [] },
    payment: { defaultGstNumber: "", defaultBillingEmail: "", tdsEnabled: true },
  },
  solo_provider: {
    notifications: { newRequirementEmail: true, newRequirementSMS: true, newRequirementWhatsApp: true, bidAcceptedEmail: true, negotiationUpdateEmail: true, paymentReceivedEmail: true },
    bidding: { autoBidSuggestions: false, preferredCategories: [], bidAlertMinBudget: 500, serviceAreas: [], whatsAppBiddingEnabled: false },
    availability: { isAvailable: true, benchAvailableFrom: "", maxConcurrentProjects: 3 },
    payout: { defaultUpiId: "", autoWithdrawThreshold: 10000 },
    profile: { publicProfileVisible: true, showRates: false },
    compliance: { autoRenewKyc: true, reminderDaysBefore: 30 },
    referral: { shareOnBidWin: false },
  },
  agency_provider: {
    notifications: { newRequirementEmail: true, newRequirementSMS: true, newRequirementWhatsApp: true, bidAcceptedEmail: true, paymentReceivedEmail: true, crewAlertEmail: true },
    bidding: { autoBidSuggestions: false, preferredCategories: [], bidAlertMinBudget: 5000, serviceAreas: [], whatsAppBiddingEnabled: false, maxCrewDeployable: 10 },
    availability: { isAvailable: true, benchAvailableFrom: "", totalCrewSize: 1 },
    payout: { defaultBankAccount: "", defaultUpiId: "", gstNumber: "", autoWithdrawThreshold: 50000 },
    profile: { publicProfileVisible: true, showRates: true, showCrewSize: true },
    compliance: { gstMandatory: true, autoRenewKyc: true, reminderDaysBefore: 30 },
    referral: { shareOnBidWin: false },
  },
  buyer: {
    notifications: { newBidEmail: true, newBidWhatsApp: true },
    preferences: { language: "en", savedLocations: [] },
    privacy: { showContactToBidders: false },
  },
  provider: {
    notifications: { newRequirementEmail: true, newRequirementWhatsApp: true },
    bidding: { preferredCategories: [], whatsAppBiddingEnabled: false },
    availability: { isAvailable: true },
  },
  both: {
    notifications: { newBidEmail: true, newRequirementEmail: true },
    preferences: { language: "en" },
  },
};

async function getOrCreateSettings(userId: string, role: string) {
  const [existing] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
  if (existing) return existing;

  const defaults = DEFAULT_SETTINGS[role] ?? DEFAULT_SETTINGS["retail_buyer"];
  const [created] = await db.insert(settingsTable).values({ userId, role, config: defaults }).returning();
  return created;
}

router.get("/settings/my", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const row = await getOrCreateSettings(user.id, user.role);
  res.json({
    settings: row.config,
    role: user.role,
    defaults: DEFAULT_SETTINGS[user.role] ?? {},
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.put("/settings/my", requireAuth, async (req, res): Promise<void> => {
  const body = z.record(z.unknown()).safeParse(req.body);
  if (!body.success) { res.status(400).json({ error: "Invalid settings object" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const existing = await getOrCreateSettings(user.id, user.role);
  const merged = { ...(existing.config as object), ...body.data };

  const [updated] = await db
    .update(settingsTable)
    .set({ config: merged, updatedAt: new Date() })
    .where(eq(settingsTable.userId, user.id))
    .returning();

  res.json({ settings: updated.config, updatedAt: updated.updatedAt.toISOString() });
});

router.get("/settings/defaults/:role", async (req, res): Promise<void> => {
  const role = req.params.role;
  const defaults = DEFAULT_SETTINGS[role];
  if (!defaults) { res.status(404).json({ error: "Unknown role" }); return; }
  res.json(defaults);
});

export default router;
