import pg from 'pg';
import dns from 'dns/promises';

async function testPoolers() {
  const region = 'ap-southeast-2';
  const prefixes = ['aws-0', 'aws-1', 'aws-2', 'aws-3', 'aws-4', 'aws-5'];
  const user = 'postgres.mrjmsmhhzkinvmljxqsk';
  const password = 'RYPX99p9MtV0u349';
  const database = 'postgres';

  console.log(`Starting probe for poolers in ${region}...`);

  for (const prefix of prefixes) {
    const host = `${prefix}-${region}.pooler.supabase.com`;
    console.log(`\nResolving DNS for ${host}...`);
    try {
      const lookups = await dns.lookup(host, { all: true });
      console.log(`Resolved addresses:`, lookups.map(l => l.address));
      
      // If it resolved, try connecting!
      const connectionString = `postgresql://${user}:${password}@${host}:6543/${database}`;
      console.log(`Trying connection to ${host}:6543...`);
      
      const client = new pg.Client({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log(`\n🎉 SUCCESSFUL CONNECTION!`);
        console.log(`Host: ${host}`);
        const res = await client.query("SELECT version();");
        console.log("Database version:", res.rows[0].version);
        await client.end();
        return;
      } catch (err) {
        console.error(`❌ Connection failed for ${host}: ${err.message}`);
        try {
          await client.end();
        } catch (e) {}
      }
    } catch (dnsErr) {
      console.log(`DNS resolution failed for ${host}: ${dnsErr.message}`);
    }
  }
  console.log("\nProbing complete.");
}

testPoolers();
