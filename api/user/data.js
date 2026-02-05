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

  logger.info(`[USER DATA] Request for userId: ${userId}`);

  try {
    // Get user from database
    const user = await db.User.findByTelegramId(userId.toString());

    logger.info(`[USER DATA] User found: ${user ? 'YES' : 'NO'}`);

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

    // User stats - Calculate from actual database data
    const totalTaps = user.total_taps || 0;

    // Get total shares from mining_shares table
    const sharesResult = await db.query(
      `SELECT COALESCE(SUM(shares), 0) as total_shares
       FROM mining_shares
       WHERE user_id = $1 AND expires_at > NOW()`,
      [user.id]
    );
    const totalShares = parseInt(sharesResult.rows[0]?.total_shares || 0);

    // Get blocks found
    const blocksFound = user.total_blocks_found || 0;

    // Calculate mining days
    const miningDays = user.created_at ?
      Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const userStats = {
      totalTaps: totalTaps,
      totalShares: totalShares,
      blocksFound: blocksFound,
      miningDays: miningDays,
      rank: 0, // Will be calculated when leaderboard is implemented
      hashrateHistory: [] // Will be populated from time-series data
    };

    // Referral stats - Calculate from referrals table
    const referralsResult = await db.query(
      `SELECT COUNT(*) as total_count,
              COUNT(*) FILTER (WHERE last_active_at > NOW() - INTERVAL '7 days') as active_count
       FROM users
       WHERE referred_by_id = $1`,
      [user.id]
    );

    const referralStats = {
      total: parseInt(referralsResult.rows[0]?.total_count || 0),
      active: parseInt(referralsResult.rows[0]?.active_count || 0),
      earned: 0 // Will be calculated from actual referral rewards
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
