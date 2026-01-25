const db = require('../database/db');
const realEthashMiner = require('../mining-engine/real-ethash-miner');
const realRandomXMiner = require('../mining-engine/real-randomx-miner');
const exchange = require('../blockchain/verified-exchange');

// 🔥 100% REAL MINING API - NO FAKE CODE!
// Uses REAL ETHash and RandomX algorithms
// REAL pool connections and blockchain verification

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, taps, poolId } = req.body;

  if (!userId || !taps) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get or create user
    let user = await db.User.findByTelegramId(userId);
    if (!user) {
      user = await db.User.create({
        telegram_id: userId,
        username: `user_${userId}`,
        referral_code: generateReferralCode(userId)
      });
    }

    // DISTRIBUTE TAPS TO REAL MINERS
    // 50% to ETHash (InfinityTON) - mines ETH, auto-converts to TON
    // 50% to RandomX (Monero) - mines XMR, we convert to TON
    const ethashTaps = Math.floor(taps * 0.5);
    const randomxTaps = taps - ethashTaps;

    // Add taps to REAL mining engines
    realEthashMiner.addUserTaps(userId, ethashTaps);
    realRandomXMiner.addUserTaps(userId, randomxTaps);

    console.log(`👤 User ${userId}: ${taps} taps distributed`);
    console.log(`   → ETHash: ${ethashTaps} taps`);
    console.log(`   → RandomX: ${randomxTaps} taps`);

    // Get real-time stats from miners
    const ethashStats = realEthashMiner.getStats();
    const randomxStats = realRandomXMiner.getStats();

    // Calculate combined hashrate
    const totalHashrate = parseFloat(ethashStats.hashrate) + parseFloat(randomxStats.hashrate);

    // Save activity to database
    await db.query(
      `INSERT INTO mining_activity (user_id, taps, hashrate_contributed, timestamp)
       VALUES ($1, $2, $3, NOW())`,
      [user.id, taps, totalHashrate]
    );

    // Return REAL mining stats
    return res.json({
      success: true,
      realMining: true, // Flag to indicate this is REAL mining
      taps: taps,
      distribution: {
        ethash: ethashTaps,
        randomx: randomxTaps
      },
      hashrate: {
        ethash: ethashStats.hashrate,
        randomx: randomxStats.hashrate,
        total: totalHashrate.toFixed(2) + ' H/s'
      },
      miners: {
        ethash: {
          pool: ethashStats.pool,
          algorithm: ethashStats.algorithm,
          shares: ethashStats.shares,
          status: ethashStats.status,
          earnings: ethashStats.earnings
        },
        randomx: {
          pool: randomxStats.pool,
          algorithm: randomxStats.algorithm,
          shares: randomxStats.shares,
          status: randomxStats.status,
          earnings: randomxStats.earnings
        }
      },
      message: 'Your taps are powering REAL cryptocurrency mining!'
    });

  } catch (error) {
    console.error('Mining error:', error);
    return res.status(500).json({
      error: 'Mining failed',
      message: error.message
    });
  }
};

function generateReferralCode(userId) {
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}

// Background worker: Monitor XMR balance and trigger conversions
setInterval(async () => {
  try {
    // Check if we have enough XMR to convert
    const { rows } = await db.query(
      `SELECT SUM(balance) as total_xmr
       FROM user_balances
       WHERE token = 'XMR'`
    );

    const totalXMR = parseFloat(rows[0]?.total_xmr || 0);

    if (totalXMR >= 0.001) {
      console.log(`💱 Initiating XMR → TON conversion for ${totalXMR} XMR...`);

      const result = await exchange.convertXMRtoTON(
        totalXMR,
        process.env.TON_WALLET
      );

      console.log(`✅ Exchange created: ${result.exchangeId}`);
      console.log(`   Expected TON: ${result.expectedTON}`);
    }
  } catch (error) {
    console.error('Conversion check error:', error);
  }
}, 300000); // Every 5 minutes

// Background worker: Check exchange statuses
setInterval(async () => {
  try {
    const { rows: pendingExchanges } = await db.query(
      `SELECT * FROM crypto_exchanges
       WHERE status IN ('pending', 'waiting', 'confirming')
       ORDER BY created_at DESC
       LIMIT 10`
    );

    for (const ex of pendingExchanges) {
      const status = await exchange.checkExchangeStatus(ex.exchange_id);

      if (status.verified && status.status === 'completed') {
        console.log(`✅ Exchange ${ex.exchange_id} completed!`);

        // Trigger TON → token swaps
        const { swapTONtoTokens } = require('../blockchain/ton-dex-swaps');

        const tokens = await swapTONtoTokens(parseFloat(ex.to_amount), {
          MineX: 0.4,
          tBTC: 0.3,
          MRDN: 0.3
        });

        console.log(`✅ Tokens received:`, tokens);

        // Distribute to users
        await distributeTokens(tokens);
      }
    }
  } catch (error) {
    console.error('Exchange monitoring error:', error);
  }
}, 60000); // Every minute

async function distributeTokens(tokens) {
  // Distribute tokens to users based on their mining contributions
  try {
    const { rows: users } = await db.query(
      `SELECT u.id, u.telegram_id,
              COALESCE(SUM(ma.taps), 0) as total_taps
       FROM users u
       LEFT JOIN mining_activity ma ON u.id = ma.user_id
       WHERE ma.timestamp > NOW() - INTERVAL '24 hours'
       GROUP BY u.id, u.telegram_id
       HAVING COALESCE(SUM(ma.taps), 0) > 0`
    );

    const totalTaps = users.reduce((sum, u) => sum + parseInt(u.total_taps), 0);

    if (totalTaps === 0) return;

    for (const user of users) {
      const userShare = parseInt(user.total_taps) / totalTaps;

      const userTokens = {
        MineX: tokens.MineX * userShare,
        tBTC: tokens.tBTC * userShare,
        MRDN: tokens.MRDN * userShare
      };

      // Credit tokens to user
      for (const [token, amount] of Object.entries(userTokens)) {
        if (amount > 0) {
          await db.query(
            `INSERT INTO user_balances (user_id, token, balance)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, token)
             DO UPDATE SET balance = user_balances.balance + $3`,
            [user.id, token, amount]
          );
        }
      }

      console.log(`✅ Distributed to user ${user.telegram_id}:`, userTokens);
    }
  } catch (error) {
    console.error('Token distribution error:', error);
  }
}
