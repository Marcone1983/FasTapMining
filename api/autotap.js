// AutoTap Passive Mining System - REAL passive income
const logger = require("../utils/logger").loggers.api;
// Generates mining shares automatically even when app is closed

// AutoTap tiers (prices in Telegram Stars)
const AUTOTAP_TIERS = {
  basic: {
    id: 'autotap_basic',
    name: 'AutoTap Basic',
    price: 500, // 500 Telegram Stars (~$5)
    sharesPerSecond: 1,
    duration: 2592000000, // 30 days in milliseconds
    icon: '🤖'
  },
  pro: {
    id: 'autotap_pro',
    name: 'AutoTap Pro',
    price: 1500, // 1500 Telegram Stars (~$15)
    sharesPerSecond: 5,
    duration: 2592000000, // 30 days
    icon: '⚡'
  },
  ultimate: {
    id: 'autotap_ultimate',
    name: 'AutoTap Ultimate',
    price: 5000, // 5000 Telegram Stars (~$50)
    sharesPerSecond: 20,
    duration: 7776000000, // 90 days
    icon: '🔥'
  },
  lifetime: {
    id: 'autotap_lifetime',
    name: 'AutoTap Lifetime',
    price: 15000, // 15000 Telegram Stars (~$150)
    sharesPerSecond: 50,
    duration: null, // Forever!
    icon: '👑'
  }
};

// Track active AutoTap subscriptions (in production: use database)
const activeAutoTaps = new Map();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get user's active AutoTap
    const autoTap = getActiveAutoTap(userId);

    if (autoTap) {
      // Calculate accumulated shares since last claim
      const accumulatedShares = calculateAccumulatedShares(userId, autoTap);

      return res.json({
        success: true,
        hasAutoTap: true,
        autoTap: {
          tier: autoTap.tier,
          sharesPerSecond: autoTap.sharesPerSecond,
          activatedAt: autoTap.activatedAt,
          expiresAt: autoTap.expiresAt,
          isLifetime: autoTap.isLifetime,
          accumulatedShares: accumulatedShares,
          estimatedDaily: autoTap.sharesPerSecond * 86400 // shares per day
        }
      });
    }

    // No active AutoTap - return available tiers
    return res.json({
      success: true,
      hasAutoTap: false,
      availableTiers: Object.values(AUTOTAP_TIERS)
    });
  }

  if (req.method === 'POST') {
    const { userId, tierId, paymentId } = req.body;

    if (!userId || !tierId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const tier = AUTOTAP_TIERS[tierId];
    if (!tier) {
      return res.status(404).json({ error: 'Invalid tier' });
    }

    // Activate AutoTap
    const autoTap = activateAutoTap(userId, tier);

    return res.json({
      success: true,
      message: `🎉 ${tier.name} activated!`,
      autoTap: {
        tier: tier.id,
        sharesPerSecond: tier.sharesPerSecond,
        duration: tier.duration,
        expiresAt: autoTap.expiresAt,
        isLifetime: tier.duration === null
      }
    });
  }

  if (req.method === 'PUT') {
    // Claim accumulated shares
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const autoTap = getActiveAutoTap(userId);
    if (!autoTap) {
      return res.status(400).json({ error: 'No active AutoTap' });
    }

    const accumulatedShares = calculateAccumulatedShares(userId, autoTap);

    // Reset last claim time
    autoTap.lastClaimAt = Date.now();
    activeAutoTaps.set(userId.toString(), autoTap);

    return res.json({
      success: true,
      claimed: accumulatedShares,
      message: `Claimed ${accumulatedShares} shares from AutoTap!`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function getActiveAutoTap(userId) {
  const autoTap = activeAutoTaps.get(userId.toString());

  if (!autoTap) return null;

  // Check if expired
  if (autoTap.expiresAt && Date.now() > autoTap.expiresAt) {
    activeAutoTaps.delete(userId.toString());
    return null;
  }

  return autoTap;
}

function activateAutoTap(userId, tier) {
  const now = Date.now();

  const autoTap = {
    userId: userId,
    tier: tier.id,
    sharesPerSecond: tier.sharesPerSecond,
    activatedAt: now,
    expiresAt: tier.duration ? now + tier.duration : null,
    isLifetime: tier.duration === null,
    lastClaimAt: now
  };

  activeAutoTaps.set(userId.toString(), autoTap);

  // In production: save to database
  // await db.autoTaps.insert(autoTap);

  logger.info(`✅ AutoTap activated for user ${userId}: ${tier.name}`);

  return autoTap;
}

function calculateAccumulatedShares(userId, autoTap) {
  const now = Date.now();
  const timeSinceLastClaim = now - autoTap.lastClaimAt;
  const secondsElapsed = Math.floor(timeSinceLastClaim / 1000);

  // Calculate shares: sharesPerSecond * seconds elapsed
  const shares = autoTap.sharesPerSecond * secondsElapsed;

  return Math.floor(shares);
}

// Background worker: Apply AutoTap shares to mining pools
module.exports.applyAutoTapShares = async () => {
  logger.info('Running AutoTap background worker...');

  for (const [userId, autoTap] of activeAutoTaps.entries()) {
    // Check if expired
    if (autoTap.expiresAt && Date.now() > autoTap.expiresAt) {
      activeAutoTaps.delete(userId);
      continue;
    }

    // Calculate accumulated shares
    const shares = calculateAccumulatedShares(userId, autoTap);

    if (shares > 0) {
      // Apply shares to user's selected pool
      // This would call the mining API to add shares
      logger.info(`AutoTap: Adding ${shares} shares for user ${userId}`);

      // In production: call mining API
      // await addSharesToPool(userId, shares);
    }
  }
};

// Helper: Get AutoTap statistics
module.exports.getAutoTapStats = () => {
  let totalActive = 0;
  let totalSharesPerSecond = 0;

  for (const autoTap of activeAutoTaps.values()) {
    if (!autoTap.expiresAt || Date.now() < autoTap.expiresAt) {
      totalActive++;
      totalSharesPerSecond += autoTap.sharesPerSecond;
    }
  }

  return {
    activeSubscriptions: totalActive,
    totalSharesPerSecond: totalSharesPerSecond,
    estimatedDailyShares: totalSharesPerSecond * 86400
  };
};

// Export tiers for shop integration
module.exports.AUTOTAP_TIERS = AUTOTAP_TIERS;
