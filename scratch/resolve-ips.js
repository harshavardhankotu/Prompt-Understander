import dns from 'dns/promises';

const regions = [
  "us-east-1", "us-east-2", "us-west-1", "us-west-2",
  "ap-south-1", "ap-south-2", "ap-southeast-1", "ap-southeast-2", "ap-southeast-3",
  "ap-northeast-1", "ap-northeast-2", "ap-northeast-3",
  "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1", "eu-central-1", "eu-central-2",
  "sa-east-1", "ca-central-1", "me-central-1"
];

async function resolveAll() {
  const dbHost = 'db.mrjmsmhhzkinvmljxqsk.supabase.co';
  let dbIps = [];
  try {
    const lookups = await dns.lookup(dbHost, { all: true });
    dbIps = lookups.map(l => l.address);
    console.log(`Database host ${dbHost} resolves to:`, lookups);
  } catch (err) {
    console.error(`Failed to resolve database host ${dbHost}:`, err.message);
  }

  console.log('\nResolving pooler hostnames...');
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    try {
      const lookups = await dns.lookup(host, { all: true });
      const ipsStr = lookups.map(l => `${l.address} (family: ${l.family})`).join(', ');
      console.log(`${region} (${host}): ${ipsStr}`);
      
      // Let's also check if any of the IPs match or are very close to the database IPs
      for (const dbIp of dbIps) {
        for (const lookup of lookups) {
          if (lookup.address === dbIp) {
            console.log(`🎉 EXACT MATCH! ${region} matches database IP ${dbIp}!`);
          } else if (lookup.family === 6 && dbIp.includes(':')) {
            // Let's compare first 4 segments of IPv6 (e.g. 2406:da1c:61c:)
            const dbSegments = dbIp.split(':').slice(0, 3).join(':');
            const lookupSegments = lookup.address.split(':').slice(0, 3).join(':');
            if (dbSegments === lookupSegments) {
              console.log(`✨ PREFIX MATCH! ${region} (${lookup.address}) matches database (${dbIp}) in prefix!`);
            }
          }
        }
      }
    } catch (err) {
      console.log(`${region}: Failed to resolve (${err.message})`);
    }
  }
}

resolveAll();
