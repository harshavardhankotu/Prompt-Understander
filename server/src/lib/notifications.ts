import { db, notificationsTable } from "@omnibid/db";

export async function notifyUser(userId: string, type: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
  await db.insert(notificationsTable).values({ userId, type, message, metadata: metadata ?? null });
}
