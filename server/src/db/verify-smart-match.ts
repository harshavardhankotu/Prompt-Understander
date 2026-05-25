import "./preload-env.js";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL must be defined.");
  process.exit(1);
}

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifySmartMatch() {
  console.log("🔍 Starting AI Smart-Match analytical verification on live database...");
  const client = await pool.connect();
  try {
    // 1. Fetch a requirement with active bids to run the match algorithm
    const reqRes = await client.query(`
      SELECT r.id, r.title, r.max_budget, r.custom_data
      FROM requirements r
      JOIN bids b ON b.requirement_id = r.id
      WHERE b.status = 'active'
      LIMIT 1;
    `);

    if (reqRes.rows.length === 0) {
      console.log("⚠️ No requirements with active bids found to verify smart-match.");
      return;
    }

    const requirement = reqRes.rows[0];
    console.log(`\n📋 Testing Requirement: [ID: ${requirement.id}] - "${requirement.title}"`);
    console.log(`   Budget: ₹${requirement.max_budget}`);
    console.log(`   Custom Data: ${JSON.stringify(requirement.custom_data)}`);

    // 2. Fetch all active bids
    const bidsRes = await client.query(`
      SELECT id, bid_amount, estimated_completion, message
      FROM bids
      WHERE requirement_id = $1 AND status = 'active';
    `, [requirement.id]);

    console.log(`\n📨 Active Bids Found: ${bidsRes.rows.length}`);
    for (const b of bidsRes.rows) {
      console.log(`  • [Bid ID: ${b.id}] Amount: ₹${b.bid_amount} | Timeline: ${b.estimated_completion} | Msg: "${b.message.substring(0, 60)}..."`);
    }

    // 3. Simulate the local deterministic LLM matching fallback scoring
    console.log("\n⚡ Simulating matching score algorithm...");
    let bestScore = -Infinity;
    let recommendedBidId = bidsRes.rows[0].id;
    let justification = "";
    const maxBudget = Number(requirement.max_budget);

    for (const b of bidsRes.rows) {
      const bidAmount = Number(b.bid_amount);
      
      let priceScore = 0;
      if (bidAmount <= maxBudget) {
        priceScore = 50 * (1 - bidAmount / maxBudget);
      } else {
        priceScore = -30 * (bidAmount / maxBudget - 1);
      }

      let days = 30;
      const match = b.estimated_completion.match(/(\d+)/);
      if (match) {
        days = parseInt(match[0], 10);
      }
      const timelineScore = Math.max(0, 30 - days);

      let alignmentScore = 0;
      const customDataStr = JSON.stringify(requirement.custom_data || "").toLowerCase();
      const messageStr = b.message.toLowerCase();
      const keywords = ["react", "node", "typescript", "rcc", "freight", "cargo", "gst", "audit"];
      for (const kw of keywords) {
        if (customDataStr.includes(kw) && messageStr.includes(kw)) {
          alignmentScore += 10;
        }
      }

      const totalScore = priceScore + timelineScore + alignmentScore;
      console.log(`  -> Bid ID: ${b.id} | Price Score: ${priceScore.toFixed(1)} | Timeline Score: ${timelineScore} | Align Score: ${alignmentScore} | Total Score: ${totalScore.toFixed(1)}`);

      if (totalScore > bestScore) {
        bestScore = totalScore;
        recommendedBidId = b.id;
        let reasoning = `This bid offers a competitive pricing of ₹${bidAmount} (budget: ₹${maxBudget}) and a reliable timeline of ${b.estimated_completion}.`;
        if (alignmentScore > 0) {
          reasoning += ` The contractor shows strong technical alignment with the sector's specific project constraints.`;
        }
        justification = reasoning;
      }
    }

    console.log("\n🎉 Match Recommendation Result:");
    console.log(`  🏆 Recommended Bid ID: ${recommendedBidId}`);
    console.log(`  📝 AI Justification:   "${justification}"`);

  } catch (err) {
    console.error("❌ verification failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

verifySmartMatch().catch(console.error);
