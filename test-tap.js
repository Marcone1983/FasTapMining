/**
 * Test Tap Functionality
 * Tests if tapping works correctly
 */

const API_BASE = 'https://fas-tap-mining.vercel.app';

async function testTap() {
  console.log('🧪 Testing Tap Functionality...\n');

  // Test user ID (replace with actual owner ID)
  const userId = '856208904';
  const poolId = 'viabtc';
  const taps = 10;

  console.log(`User ID: ${userId}`);
  console.log(`Pool ID: ${poolId}`);
  console.log(`Taps: ${taps}\n`);

  try {
    // Test health endpoint first
    console.log('1️⃣ Testing health endpoint...');
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthRes.json();
    console.log('Health:', JSON.stringify(healthData, null, 2), '\n');

    // Test mining endpoint
    console.log('2️⃣ Testing mining endpoint...');
    const miningRes = await fetch(`${API_BASE}/api/mining`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, poolId, taps })
    });

    console.log('Status:', miningRes.status);
    console.log('Status Text:', miningRes.statusText);

    const miningData = await miningRes.json();
    console.log('Mining Response:', JSON.stringify(miningData, null, 2), '\n');

    // Test user data endpoint
    console.log('3️⃣ Testing user data endpoint...');
    const userRes = await fetch(`${API_BASE}/api/user/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    const userData = await userRes.json();
    console.log('User Data:', JSON.stringify(userData, null, 2), '\n');

    // Summary
    console.log('✅ Test Complete!\n');

    if (miningData.success) {
      console.log('✅ Mining API works!');
      console.log(`   Shares added: ${miningData.shares || 'unknown'}`);
      console.log(`   Hashrate: ${miningData.hashrate || 'unknown'}`);
    } else {
      console.log('❌ Mining API failed!');
      console.log(`   Error: ${miningData.error || 'unknown'}`);
    }

    if (userData.success) {
      console.log('✅ User Data API works!');
      console.log(`   Total taps: ${userData.userData?.totalTaps || 0}`);
      console.log(`   Total shares: ${userData.userStats?.totalShares || 0}`);
      console.log(`   Hashrate: ${userData.userData?.hashrate || 0}`);
    } else {
      console.log('❌ User Data API failed!');
      console.log(`   Error: ${userData.error || 'unknown'}`);
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run test
testTap();
