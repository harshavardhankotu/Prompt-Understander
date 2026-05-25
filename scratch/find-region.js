import https from 'https';

const TARGET_IP = "2406:da1c:61c:d602:392a:e428:b0ea:9a2e";

// Helper to expand an IPv6 address to its full 32-character hex string
function expandIPv6(ip) {
  // Split ip and prefix length if present
  const [address, prefixLen] = ip.split('/');
  const parts = address.split(':');
  
  // Handle "::" double colon
  let expandedParts = [];
  let doubleColonIndex = parts.indexOf('');
  
  if (doubleColonIndex !== -1) {
    // There is a double colon
    const left = parts.slice(0, doubleColonIndex);
    const right = parts.slice(doubleColonIndex + 1);
    
    // Filter out extra empty elements if :: is at start/end
    const leftFiltered = left.filter(x => x !== '');
    const rightFiltered = right.filter(x => x !== '');
    
    const missingCount = 8 - (leftFiltered.length + rightFiltered.length);
    const middle = Array(missingCount).fill('0000');
    
    expandedParts = [
      ...leftFiltered.map(p => p.padStart(4, '0')),
      ...middle,
      ...rightFiltered.map(p => p.padStart(4, '0'))
    ];
  } else {
    expandedParts = parts.map(p => p.padStart(4, '0'));
  }
  
  const hex = expandedParts.join('');
  return { hex, prefixLen: prefixLen ? parseInt(prefixLen, 10) : 128 };
}

// Check if an IP is in a CIDR block
function ipInCidr(ipHex, cidrHex, prefixLen) {
  // Each hex char is 4 bits
  const charsToCheck = Math.floor(prefixLen / 4);
  const remainingBits = prefixLen % 4;
  
  if (ipHex.slice(0, charsToCheck) !== cidrHex.slice(0, charsToCheck)) {
    return false;
  }
  
  if (remainingBits > 0) {
    const ipVal = parseInt(ipHex[charsToCheck], 16);
    const cidrVal = parseInt(cidrHex[charsToCheck], 16);
    const mask = (0xF0 >> (remainingBits - 1)) & 0xF;
    return (ipVal & mask) === (cidrVal & mask);
  }
  
  return true;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log(`Downloading AWS IP ranges to check IP: ${TARGET_IP}...`);
  try {
    const data = await fetchJson('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const prefixes = data.ipv6_prefixes || [];
    
    const targetExpanded = expandIPv6(TARGET_IP).hex;
    console.log(`Expanded target IP: ${targetExpanded}`);
    
    let matched = false;
    for (const item of prefixes) {
      const { hex: cidrHex, prefixLen } = expandIPv6(item.ipv6_prefix);
      if (ipInCidr(targetExpanded, cidrHex, prefixLen)) {
        console.log(`\n🎉 MATCH FOUND!`);
        console.log(`Prefix: ${item.ipv6_prefix}`);
        console.log(`Region: ${item.region}`);
        console.log(`Service: ${item.service}`);
        matched = true;
      }
    }
    
    if (!matched) {
      console.log('\n❌ No matching AWS IPv6 range found.');
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

run();
