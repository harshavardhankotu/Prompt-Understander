import pg from 'pg';

async function testDirectIpv6() {
  const host = '2406:da1c:61c:d602:392a:e428:b0ea:9a2e';
  const port = 5432;
  const user = 'postgres';
  const password = 'RYPX99p9MtV0u349';
  const database = 'postgres';

  const connectionString = `postgresql://${user}:${password}@[${host}]:${port}/${database}`;
  console.log(`Testing direct IPv6 connection to: ${connectionString.replace(password, 'xxxxxx')}`);

  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log("🎉 SUCCESSFUL DIRECT IPv6 CONNECTION!");
    const res = await client.query("SELECT version();");
    console.log("Database version:", res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error("❌ Connection failed!");
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
  }
}

testDirectIpv6();
