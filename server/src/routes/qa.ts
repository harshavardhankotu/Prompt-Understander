import { Router, type IRouter } from "express";
import { exec } from "child_process";
import path from "path";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/seed", (req, res) => {
  logger.info("Triggering database seed via QA route");
  
  // Execute the seed-demo script from the drizzle package
  const projectRoot = path.resolve(process.cwd(), "..");
  const command = "pnpm --filter @omnibid/db run seed-demo";
  
  exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
    if (error) {
      logger.error({ error, stderr }, "Seed command failed");
      return res.status(500).json({ error: "Seed failed", details: stderr });
    }
    logger.info({ stdout }, "Seed command succeeded");
    res.json({ message: "Database seeded successfully", output: stdout });
  });
});

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    version: "0.1.0-phase-a",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

export default router;
