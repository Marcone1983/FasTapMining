#!/usr/bin/env node
const https = require('https');

const data = JSON.stringify({
  userId: 856208904,
  taps: 10,
  poolId: "viabtc"
});

const options = {
  hostname: 'fas-tap-mining.vercel.app',
  port: 443,
  path: '/api/mining',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('🧪 Testing tap functionality...\n');
console.log('Request:', data);
console.log('');

const req = https.request(options, (res) => {
  let responseData = '';

  res.on('data', (chunk) => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('');

    try {
      const json = JSON.parse(responseData);
      console.log('Response:', JSON.stringify(json, null, 2));

      if (json.success) {
        console.log('\n✅ TAP WORKS! Stats updated successfully!');
        console.log(`   - Shares: ${json.shares || 'N/A'}`);
        console.log(`   - Hashrate: ${json.hashrate || 'N/A'}`);
      } else {
        console.log('\n❌ TAP FAILED!');
        console.log('   Error:', json.error || json.message || 'Unknown error');
        if (json.details) {
          console.log('   Details:', json.details);
        }
      }
    } catch (e) {
      console.log('Raw Response:', responseData);
      console.log('\n❌ Failed to parse JSON response');
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.write(data);
req.end();
