import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/health", async (_req, res) => {
  try {
    const { db } = await import("@omnibid/db");
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", database: "disconnected", error: String(err) });
  }
});

export default router;
