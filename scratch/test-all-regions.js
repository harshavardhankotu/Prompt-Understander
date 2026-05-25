import pg from 'pg';

const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ca-central-1", "sa-east-1",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2", "eu-north-1", "eu-south-1", "eu-south-2",
  "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2", "ap-southeast-3", "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "me-central-1"
];

async function testAll() {
  const user = 'postgres.mrjmsmhhzkinvmljxqsk';
  const password = 'RYPX99p9MtV0u349';
  const database = 'postgres';

  console.log("Starting comprehensive regional check...");
  
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://${user}:${password}@${host}:6543/${database}`;
    
    const client = new pg.Client({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 3000
    });

    try {
      await client.connect();
      console.log(`\n🎉 SUCCESS in ${region}! Database connected successfully!`);
      const res = await client.query("SELECT version();");
      console.log(`Version: ${res.rows[0].version}`);
      await client.end();
      return;
    } catch (err) {
      console.log(`[${region}] Error: ${err.message}`);
      try {
        await client.end();
      } catch (e) {}
    }
  }
  console.log("\nFinished probing all regions.");
}

testAll();
