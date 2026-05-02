import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { CreateReviewBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [review] = await db.insert(reviewsTable).values({
    requirementId: parsed.data.requirementId,
    reviewerId: req.user!.userId,
    revieweeId: parsed.data.revieweeId,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
  }).returning();

  const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, review.reviewerId));

  res.status(201).json({
    id: review.id,
    requirementId: review.requirementId,
    reviewerId: review.reviewerId,
    revieweeId: review.revieweeId,
    rating: review.rating,
    comment: review.comment,
    reviewerName: reviewer?.name ?? "Unknown",
    createdAt: review.createdAt.toISOString(),
  });
});

router.get("/users/:id/reviews", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, id)).orderBy(desc(reviewsTable.createdAt));

  const result = await Promise.all(reviews.map(async (r) => {
    const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, r.reviewerId));
    return {
      id: r.id,
      requirementId: r.requirementId,
      reviewerId: r.reviewerId,
      revieweeId: r.revieweeId,
      rating: r.rating,
      comment: r.comment,
      reviewerName: reviewer?.name ?? "Unknown",
      createdAt: r.createdAt.toISOString(),
    };
  }));

  res.json(result);
});

export default router;
