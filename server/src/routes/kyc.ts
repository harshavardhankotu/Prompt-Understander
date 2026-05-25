import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

// ── Zod validation ────────────────────────────────────────────────────────────
const VerifyKycBody = z.object({
  aadhaarNumber: z
    .string()
    .regex(/^\d{12}$/, "Aadhaar number must be exactly 12 digits"),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "PAN must match format: ABCDE1234F"),
});

// ── POST /api/kyc/verify ───────────────────────────────────────────────────────
/**
 * DigiLocker-inspired KYC verification endpoint.
 *
 * In production this would:
 *   1. Call the DigiLocker OAuth2 API to pull the Aadhaar e-document
 *   2. Verify PAN via NSDL/UTIITSL API
 *   3. Create a Razorpay Linked Account for the contractor
 *
 * For now, we simulate a successful government check and update the user record.
 */
router.post("/kyc/verify", requireAuth, async (req, res): Promise<void> => {
  const parsed = VerifyKycBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const userId = req.user!.userId;

  // 1. Fetch the current user to check state
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Idempotency: already verified
  if (user.kycStatus === "verified") {
    res.json({
      success: true,
      kycStatus: "verified",
      kycVerifiedAt: user.kycVerifiedAt?.toISOString(),
      razorpayLinkedAccountId: user.razorpayLinkedAccountId,
      message: "KYC already verified (idempotent response).",
    });
    return;
  }

  // 2. Mock DigiLocker government check
  //    Simulate: Aadhaar & PAN data match → verification approved
  const simulatedMatch = parsed.data.aadhaarNumber.length === 12 && parsed.data.panNumber.length === 10;

  if (!simulatedMatch) {
    // In production this would be a real government API rejection
    await db.update(usersTable)
      .set({ kycStatus: "rejected" })
      .where(eq(usersTable.id, userId));

    res.status(422).json({
      success: false,
      kycStatus: "rejected",
      error: "Government database check failed: Aadhaar–PAN mismatch.",
    });
    return;
  }

  // 3. Generate a mock Razorpay Linked Account ID
  //    In production: call razorpay.accounts.create({ name, email, business_type... })
  const razorpayLinkedAccountId = `acc_${Date.now().toString(36)}_${userId.substring(0, 8)}`;
  const verifiedAt = new Date();

  // 4. Atomically update user record
  const [updatedUser] = await db
    .update(usersTable)
    .set({
      kycStatus: "verified",
      kycVerifiedAt: verifiedAt,
      aadhaarVerified: true,     // also sets the legacy compliance gate flag
      isVerified: true,          // unlock the platform's verified badge
      razorpayLinkedAccountId,
    })
    .where(eq(usersTable.id, userId))
    .returning();

  res.json({
    success: true,
    kycStatus: "verified",
    kycVerifiedAt: updatedUser.kycVerifiedAt?.toISOString(),
    razorpayLinkedAccountId: updatedUser.razorpayLinkedAccountId,
    isVerified: updatedUser.isVerified,
    aadhaarVerified: updatedUser.aadhaarVerified,
    message: "KYC verified successfully. Your account is now fully activated.",
  });
});

// ── GET /api/kyc/status ────────────────────────────────────────────────────────
// Lightweight status check used by the frontend banner.
router.get("/kyc/status", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select({
      kycStatus: usersTable.kycStatus,
      kycVerifiedAt: usersTable.kycVerifiedAt,
      aadhaarVerified: usersTable.aadhaarVerified,
      isVerified: usersTable.isVerified,
      razorpayLinkedAccountId: usersTable.razorpayLinkedAccountId,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  res.json(user);
});

export default router;
