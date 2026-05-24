import { db, usersTable, paymentsTable, disputesTable } from "@omnibid/db";
import { eq, and, count } from "drizzle-orm";

/**
 * Calculates and updates a provider's OmniCredit Score (300-900).
 * Based on:
 * - Base score: 500
 * - Completed jobs: +15 points per completed job
 * - Active/lost disputes: -50 points per dispute
 * - KYC Verification: +50 points if Aadhaar and PAN verified
 * - Trust score: +2 points per trust score unit
 */
export async function recalculateOmniScore(providerId: string): Promise<number> {
  try {
    const [provider] = await db.select().from(usersTable).where(eq(usersTable.id, providerId));
    if (!provider) return 500;

    // 1. Get completed jobs count
    const [compStats] = await db
      .select({ count: count() })
      .from(paymentsTable)
      .where(and(eq(paymentsTable.providerId, providerId), eq(paymentsTable.escrowStatus, "released")));
    const completedJobs = Number(compStats?.count ?? 0);

    // 2. Get disputes count
    const [disputeStats] = await db
      .select({ count: count() })
      .from(disputesTable)
      .where(eq(disputesTable.respondentId, providerId));
    const disputes = Number(disputeStats?.count ?? 0);

    // 3. Compute score
    let score = 500; // Base score
    score += completedJobs * 15; // +15 per completed job
    score -= disputes * 50; // -50 per dispute

    if (provider.aadhaarVerified) {
      score += 50; // KYC Boost
    }

    score += (provider.trustScore ?? 0) * 2; // Trust score integration

    // Bound the score between 300 and 900
    score = Math.max(300, Math.min(900, score));

    // Update in database
    await db
      .update(usersTable)
      .set({ omniScore: score })
      .where(eq(usersTable.id, providerId));

    return score;
  } catch (error) {
    console.error(`Failed to recalculate OmniCredit score for ${providerId}:`, error);
    return 500;
  }
}
