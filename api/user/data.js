// API endpoint for complete user data
const db = require('../../database/db');

module.exports = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID required'
    });
  }

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
      achievements
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Helper function to get active boosts
async function getActiveBoosts(userId) {
  try {
    const result = await db.query(
      `SELECT mp.*, mi.name as item_name, mi.effect
       FROM marketplace_purchases mp
       JOIN marketplace_items mi ON mp.item_id = mi.id
       WHERE mp.user_id = $1
       AND mp.status = 'confirmed'
       AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
       ORDER BY mp.purchased_at DESC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      itemName: row.item_name,
      effect: row.effect,
      isPermanent: !row.expires_at,
      expiresAt: row.expires_at,
      daysRemaining: row.expires_at ?
        Math.ceil((new Date(row.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) :
        null
    }));
  } catch (error) {
    console.error('Error getting active boosts:', error);
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
    console.error('Error getting achievements:', error);
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
