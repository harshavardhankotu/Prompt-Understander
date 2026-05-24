import { Router, type IRouter } from "express";
import { eq, desc, inArray } from "drizzle-orm";
import { db, notificationsTable } from "@omnibid/db";
import { MarkNotificationsReadBody } from "@omnibid/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const notifs = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, req.user!.userId)).orderBy(desc(notificationsTable.createdAt)).limit(50);
  res.json(notifs.map((n) => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    message: n.message,
    isRead: n.isRead,
    metadata: n.metadata,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.post("/notifications/mark-read", requireAuth, async (req, res): Promise<void> => {
  const parsed = MarkNotificationsReadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (parsed.data.ids.length > 0) {
    await db.update(notificationsTable).set({ isRead: true }).where(inArray(notificationsTable.id, parsed.data.ids));
  }
  res.json({ message: "Marked as read" });
});

export default router;
