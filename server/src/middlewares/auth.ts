import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "omnibid-secret-key";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
      req.user = payload;
    } catch {
      // ignore invalid token in optional auth
    }
  }
  next();
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireCompliance(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { db, complianceVaultTable, usersTable } = await import("@omnibid/db");
    const { eq } = await import("drizzle-orm");

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!["solo_provider", "agency_provider"].includes(user.role)) {
      next();
      return;
    }

    const [vault] = await db.select().from(complianceVaultTable).where(eq(complianceVaultTable.userId, user.id));

    if (!vault || (vault.aadhaarStatus !== "verified" && !user.aadhaarVerified)) {
      res.status(403).json({
        error: "Compliance Gate Blocked",
        details: "You must verify your Aadhaar in the Compliance Vault before bidding.",
        code: "COMPLIANCE_GATE_BLOCKED"
      });
      return;
    }

    next();
  } catch (err) {
    res.status(500).json({ error: "Compliance check failed", details: String(err) });
  }
}
