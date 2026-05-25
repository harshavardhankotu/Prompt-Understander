import pg from "pg";

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ap-south-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "sa-east-1",
  "ca-central-1"
];

async function testRegions() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const connectionString = `postgresql://postgres.mrjmsmhhzkinvmljxqsk:RYPX99p9MtV0u349@${host}:6543/postgres`;
    
    const client = new pg.Client({ 
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });
    try {
      console.log(`Testing region: ${region} (${host})...`);
      await client.connect();
      console.log(`✅ SUCCESS! Project mrjmsmhhzkinvmljxqsk is hosted in: ${region}`);
      await client.end();
      return region;
    } catch (err) {
      if (err.message.includes("tenant/user") && err.message.includes("not found")) {
        // Tenant not in this region
        continue;
      }
      if (err.message.includes("password authentication failed")) {
        console.log(`🔑 PASSWORD MATCH FAILED! The region is correct (${region}), but the password is wrong!`);
        await client.end();
        return region;
      }
      console.log(`Error in ${region}:`, err.message);
    }
  }
  console.log("❌ Failed to resolve hosting region.");
  return null;
}

testRegions();
