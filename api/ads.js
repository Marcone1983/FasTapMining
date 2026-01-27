// Telegram Ads Integration - Monetization through Ad Network
const logger = require("../utils/logger").loggers.api;

// Telegram Ads configuration
const ADS_CONFIG = {
  blockId: process.env.TELEGRAM_ADS_BLOCK_ID || 'your_ad_block_id_here',
  enabled: true,
  minInterval: 300000, // 5 minutes between ads
  rewardMultiplier: 1.5 // 1.5x mining speed for watching ad
};

// Track ad views per user
const adViews = new Map();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Check if user can view ad (rate limiting)
    const lastView = adViews.get(userId) || 0;
    const timeSinceLastAd = Date.now() - lastView;

    if (timeSinceLastAd < ADS_CONFIG.minInterval) {
      const waitTime = Math.ceil((ADS_CONFIG.minInterval - timeSinceLastAd) / 1000 / 60);

      return res.json({
        success: false,
        canViewAd: false,
        message: `Please wait ${waitTime} more minutes before watching another ad`,
        nextAdAvailable: lastView + ADS_CONFIG.minInterval
      });
    }

    return res.json({
      success: true,
      canViewAd: true,
      adConfig: {
        blockId: ADS_CONFIG.blockId,
        rewardMultiplier: ADS_CONFIG.rewardMultiplier,
        duration: 30 // seconds
      }
    });
  }

  if (req.method === 'POST') {
    const { userId, adCompleted } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    if (!adCompleted) {
      return res.status(400).json({ error: 'Ad not completed' });
    }

    // Mark ad as viewed
    adViews.set(userId, Date.now());

    // Give reward boost
    const boostDuration = 600000; // 10 minutes of boosted mining

    return res.json({
      success: true,
      reward: {
        type: 'mining_boost',
        multiplier: ADS_CONFIG.rewardMultiplier,
        duration: boostDuration,
        expiresAt: Date.now() + boostDuration
      },
      message: `🎉 Ad watched! Mining speed boosted by ${ADS_CONFIG.rewardMultiplier}x for 10 minutes!`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// Helper: Get user's active ad boosts
module.exports.getActiveBoosts = (userId) => {
  // In production: fetch from database
  return {
    hasActiveBoost: false,
    multiplier: 1.0,
    expiresAt: null
  };
};
