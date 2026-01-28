// API endpoint for complete user data
const db = require('../../database/db');
const { validate, TYPES, commonSchemas } = require('../../middleware/validate');
const { rateLimit } = require('../../middleware/security');
const logger = require('../../utils/logger').loggers.api;

// Rate limiting: 60 requests per minute per user
const userDataRateLimit = rateLimit({
  windowMs: 60000,
  max: 60,
  keyGenerator: (req) => req.query?.userId || req.ip
});

const userDataValidation = validate({
  query: {
    userId: commonSchemas.userId
  }
});

async function userDataHandler(req, res) {
  const { userId } = req.validated;

  try {
    // Get user from database
    const user = await db.User.findByTelegramId(userId.toString());

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get balances (8 real coins)
    const balances = user.balances || {
      LTC: 0,
      DOGE: 0,
      TON: 0,
      BELLS: 0,
      LKY: 0,
      PEP: 0,
      JKC: 0,
      DINGO: 0
    };

    // Calculate total earnings in USD (would need price API integration)
    const totalEarnings = user.total_earnings_usd || 0;

    // User stats
    const userStats = {
      totalTaps: user.total_taps || 0,
      totalShares: user.total_shares || 0,
      blocksFound: user.blocks_found || 0,
      miningDays: user.mining_days || 0,
      rank: user.global_rank || 0,
      hashrateHistory: user.hashrate_history || []
    };

    // Referral stats
    const referralStats = {
      total: user.referrals_count || 0,
      active: user.active_referrals_count || 0,
      earned: user.referral_earnings_usd || 0
    };

    // Get active marketplace boosts
    const activeBoosts = await getActiveBoosts(user.id);

    // Get achievements
    const achievements = await getAchievements(user.id);

    // Generate or get referral code
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(user.id);
      await db.query(
        'UPDATE users SET referral_code = $1 WHERE id = $2',
        [referralCode, user.id]
      );
    }

    res.status(200).json({
      success: true,
      balances,
      hashrate: user.hashrate || 0,
      totalEarnings,
      stats: userStats,
      referralCode,
      referralStats,
      activeBoosts,
      achievements,
      hasLifetimeAccess: user.has_lifetime_access || false
    });

  } catch (error) {
    logger.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// Export with middleware
module.exports = async (req, res) => {
  return userDataRateLimit(req, res, () => {
    return userDataValidation(req, res, () => {
      return userDataHandler(req, res);
    });
  });
};

// Helper function to get active boosts
async function getActiveBoosts(userId) {
  try {
    const marketplaceService = require('../../services/marketplace-service');

    const result = await db.query(
      `SELECT *
       FROM marketplace_purchases
       WHERE user_id = $1
       AND status = 'confirmed'
       AND (expires_on IS NULL OR expires_on > NOW())
       ORDER BY activated_at DESC`,
      [userId]
    );

    // Get marketplace items for details
    const marketplaceItems = marketplaceService.getMarketplaceItems();

    return result.rows.map(row => {
      // Get item details from marketplace service
      const itemDetails = marketplaceItems.find(item => item.id === row.item_type);
      const itemName = itemDetails ? itemDetails.name : row.item_type;
      const itemDescription = itemDetails ? itemDetails.description : 'Boost active';

      return {
        id: row.id,
        itemName: itemName,
        effect: itemDescription,
        isPermanent: !row.expires_on,
        expiresAt: row.expires_on,
        daysRemaining: row.expires_on ?
          Math.ceil((new Date(row.expires_on) - new Date()) / (1000 * 60 * 60 * 24)) :
          null
      };
    });
  } catch (error) {
    logger.error('Error getting active boosts:', error);
    return [];
  }
}

// Helper function to get achievements
async function getAchievements(userId) {
  try {
    const result = await db.query(
      `SELECT * FROM user_achievements
       WHERE user_id = $1
       ORDER BY earned_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.achievement_name,
      description: row.description,
      icon: row.icon,
      earned: row.earned_at
    }));
  } catch (error) {
    logger.error('Error getting achievements:', error);
    return [];
  }
}

// Helper function to generate referral code
function generateReferralCode(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code + userId.toString().slice(-2);
}
