import pg from 'pg';

async function testSydney() {
  const host = 'aws-0-ap-southeast-2.pooler.supabase.com';
  const port = 6543;
  const user = 'postgres.mrjmsmhhzkinvmljxqsk';
  const password = 'RYPX99p9MtV0u349';
  const database = 'postgres';

  // We will try different connection strings / options without sslmode in query string
  const configs = [
    {
      name: "Standard Pooler (Transaction Mode, port 6543, no query ssl)",
      connectionString: `postgresql://${user}:${password}@${host}:${port}/${database}`
    },
    {
      name: "Session Mode Pooler (port 5432 on pooler host, no query ssl)",
      connectionString: `postgresql://${user}:${password}@${host}:5432/${database}`
    }
  ];

  for (const config of configs) {
    console.log(`\n--- Testing: ${config.name} ---`);
    console.log(`URL: ${config.connectionString.replace(password, 'xxxxxx')}`);
    
    const client = new pg.Client({
      connectionString: config.connectionString,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log("🎉 SUCCESSFUL CONNECTION!");
      const res = await client.query("SELECT version();");
      console.log("Database version:", res.rows[0].version);
      await client.end();
      return;
    } catch (err) {
      console.error("❌ Connection failed!");
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
    }
  }
}

testSydney();
