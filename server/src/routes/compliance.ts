import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, complianceVaultTable, usersTable } from "@omnibid/db";
import { requireAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const UpsertComplianceBody = z.object({
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  mcaRegistration: z.string().optional(),
  insuranceUploadUrl: z.string().optional(),
  aadhaarStatus: z.enum(["pending", "verified"]).optional(),
});

router.get("/compliance/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [vault] = await db
    .select()
    .from(complianceVaultTable)
    .where(eq(complianceVaultTable.userId, userId));

  if (!vault) {
    res.json(null);
    return;
  }

  res.json({
    id: vault.id,
    userId: vault.userId,
    aadhaarStatus: vault.aadhaarStatus,
    panNumber: vault.panNumber,
    gstNumber: vault.gstNumber,
    mcaRegistration: vault.mcaRegistration,
    insuranceUploadUrl: vault.insuranceUploadUrl,
    isEmpanelled: vault.isEmpanelled,
    createdAt: vault.createdAt.toISOString(),
    updatedAt: vault.updatedAt.toISOString(),
  });
});

router.put("/compliance/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const parsed = UpsertComplianceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const requiresGst = user.role === "enterprise_buyer" || user.role === "agency_provider";
  if (requiresGst && parsed.data.gstNumber === "") {
    res.status(400).json({ error: "GST Number is mandatory for Enterprise Buyers and Agency Providers" });
    return;
  }

  const updatePayload = {
    ...parsed.data,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select()
    .from(complianceVaultTable)
    .where(eq(complianceVaultTable.userId, userId));

  let vault;
  if (existing) {
    [vault] = await db
      .update(complianceVaultTable)
      .set(updatePayload)
      .where(eq(complianceVaultTable.userId, userId))
      .returning();
  } else {
    [vault] = await db
      .insert(complianceVaultTable)
      .values({ userId, ...updatePayload })
      .returning();
  }

  res.json({
    id: vault.id,
    userId: vault.userId,
    aadhaarStatus: vault.aadhaarStatus,
    panNumber: vault.panNumber,
    gstNumber: vault.gstNumber,
    mcaRegistration: vault.mcaRegistration,
    insuranceUploadUrl: vault.insuranceUploadUrl,
    isEmpanelled: vault.isEmpanelled,
    createdAt: vault.createdAt.toISOString(),
    updatedAt: vault.updatedAt.toISOString(),
  });
});

export default router;
