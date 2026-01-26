const db = require('../database/db');

/**
 * Referral System Service
 * Handles referral relationships and rewards distribution
 */
class ReferralService {
  constructor() {
    // Default rewards if not configured
    this.defaultRewards = {
      referrer: {
        LTC: 0.001,
        DOGE: 1.0,
        TON: 0.1
      },
      referred: {
        LTC: 0.0005,
        DOGE: 0.5,
        TON: 0.05
      }
    };
  }

  /**
   * Get referral rewards configuration from database
   */
  async getRewardsConfig() {
    try {
      const config = await db.query(
        `SELECT value FROM system_config WHERE key = 'referral_rewards'`
      );

      if (config.rows.length > 0) {
        return JSON.parse(config.rows[0].value);
      }

      return this.defaultRewards;

    } catch (error) {
      console.error('❌ Error getting referral config:', error);
      return this.defaultRewards;
    }
  }

  /**
   * Generate unique referral code for user
   */
  generateReferralCode(userId) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const codeLength = 8;
    let code = '';

    // Create code from user ID + random
    const userIdStr = userId.toString().padStart(4, '0');
    const random = Date.now().toString(36).toUpperCase();

    code = (userIdStr + random).substring(0, codeLength);

    // Ensure it's always uppercase alphanumeric
    code = code.split('').map(char => {
      const idx = Math.abs(char.charCodeAt(0)) % alphabet.length;
      return alphabet[idx];
    }).join('');

    return code;
  }

  /**
   * Get or create referral code for user
   */
  async getUserReferralCode(telegramId) {
    try {
      const user = await db.User.findByTelegramId(telegramId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Check if user already has a referral code
      if (user.referral_code) {
        return {
          success: true,
          referralCode: user.referral_code,
          referralUrl: `https://t.me/FasTapMiningBot?start=${user.referral_code}`
        };
      }

      // Generate new referral code
      const referralCode = this.generateReferralCode(user.id);

      // Save to database
      await db.query(
        `UPDATE users SET referral_code = $1 WHERE id = $2`,
        [referralCode, user.id]
      );

      console.log(`🎫 Generated referral code for user ${telegramId}: ${referralCode}`);

      return {
        success: true,
        referralCode: referralCode,
        referralUrl: `https://t.me/FasTapMiningBot?start=${referralCode}`
      };

    } catch (error) {
      console.error('❌ Error getting referral code:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process referral when new user joins with referral code
   */
  async processReferral(newUserTelegramId, referralCode) {
    try {
      // Get new user
      const newUser = await db.User.findByTelegramId(newUserTelegramId);
      if (!newUser) {
        return { success: false, error: 'New user not found' };
      }

      // Check if user was already referred
      const existingReferral = await db.query(
        `SELECT * FROM referrals WHERE referred_id = $1`,
        [newUser.id]
      );

      if (existingReferral.rows.length > 0) {
        return {
          success: false,
          error: 'User already referred',
          alreadyReferred: true
        };
      }

      // Find referrer by code
      const referrerResult = await db.query(
        `SELECT * FROM users WHERE referral_code = $1`,
        [referralCode]
      );

      if (referrerResult.rows.length === 0) {
        return {
          success: false,
          error: 'Invalid referral code'
        };
      }

      const referrer = referrerResult.rows[0];

      // User cannot refer themselves
      if (referrer.id === newUser.id) {
        return {
          success: false,
          error: 'Cannot refer yourself'
        };
      }

      // Create referral relationship
      await db.query(
        `INSERT INTO referrals (referrer_id, referred_id, reward_given, created_at)
         VALUES ($1, $2, FALSE, NOW())`,
        [referrer.id, newUser.id]
      );

      console.log(`🎁 Referral created: User ${referrer.telegram_id} referred ${newUser.telegram_id}`);
      console.log(`💡 Referrer will get 10% of referred user's mining hashrate automatically`);

      return {
        success: true,
        referrerId: referrer.id,
        referredId: newUser.id,
        rewardsDistributed: false // No upfront rewards - gets 10% mining bonus instead
      };

    } catch (error) {
      console.error('❌ Error processing referral:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Distribute rewards to both referrer and referred user
   */
  async distributeReferralRewards(referrerId, referredId) {
    try {
      const rewardsConfig = await this.getRewardsConfig();

      const rewardsGiven = {
        referrer: rewardsConfig.referrer,
        referred: rewardsConfig.referred
      };

      // Give rewards to referrer
      for (const [coin, amount] of Object.entries(rewardsConfig.referrer)) {
        await db.User.updateBalance(referrerId, coin, amount, 'add');
        console.log(`   💰 Referrer +${amount} ${coin}`);
      }

      // Give rewards to referred user
      for (const [coin, amount] of Object.entries(rewardsConfig.referred)) {
        await db.User.updateBalance(referredId, coin, amount, 'add');
        console.log(`   💰 Referred user +${amount} ${coin}`);
      }

      // Mark rewards as given
      await db.query(
        `UPDATE referrals
         SET reward_given = TRUE, reward_amount = $1
         WHERE referrer_id = $2 AND referred_id = $3`,
        [JSON.stringify(rewardsGiven), referrerId, referredId]
      );

      console.log(`✅ Referral rewards distributed successfully`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error distributing referral rewards:', error);
      throw error;
    }
  }

  /**
   * Get user's referral statistics
   */
  async getUserReferralStats(telegramId) {
    try {
      const user = await db.User.findByTelegramId(telegramId);

      if (!user) {
        return {
          success: false,
          error: 'User not found'
        };
      }

      // Get total referrals
      const referrals = await db.query(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE reward_given = TRUE) as rewarded
         FROM referrals
         WHERE referrer_id = $1`,
        [user.id]
      );

      // Get list of referred users (last 10)
      const referredUsers = await db.query(
        `SELECT u.telegram_id, r.created_at, r.reward_given
         FROM referrals r
         JOIN users u ON u.id = r.referred_id
         WHERE r.referrer_id = $1
         ORDER BY r.created_at DESC
         LIMIT 10`,
        [user.id]
      );

      // Calculate total rewards earned
      const totalRewards = await db.query(
        `SELECT reward_amount FROM referrals
         WHERE referrer_id = $1 AND reward_given = TRUE`,
        [user.id]
      );

      const earnedRewards = {
        LTC: 0,
        DOGE: 0,
        TON: 0
      };

      for (const row of totalRewards.rows) {
        if (row.reward_amount && row.reward_amount.referrer) {
          for (const [coin, amount] of Object.entries(row.reward_amount.referrer)) {
            earnedRewards[coin] = (earnedRewards[coin] || 0) + amount;
          }
        }
      }

      return {
        success: true,
        referralCode: user.referral_code,
        referralUrl: user.referral_code ? `https://t.me/FasTapMiningBot?start=${user.referral_code}` : null,
        stats: {
          totalReferrals: parseInt(referrals.rows[0].total),
          rewardedReferrals: parseInt(referrals.rows[0].rewarded),
          earnedRewards: earnedRewards,
          recentReferrals: referredUsers.rows.map(r => ({
            telegramId: r.telegram_id,
            joinedAt: r.created_at,
            rewarded: r.reward_given
          }))
        }
      };

    } catch (error) {
      console.error('❌ Error getting referral stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get global referral leaderboard
   */
  async getLeaderboard(limit = 10) {
    try {
      const leaderboard = await db.query(
        `SELECT u.telegram_id, u.referral_code, COUNT(r.id) as total_referrals
         FROM users u
         LEFT JOIN referrals r ON r.referrer_id = u.id
         WHERE u.referral_code IS NOT NULL
         GROUP BY u.id, u.telegram_id, u.referral_code
         HAVING COUNT(r.id) > 0
         ORDER BY COUNT(r.id) DESC
         LIMIT $1`,
        [limit]
      );

      return {
        success: true,
        leaderboard: leaderboard.rows.map((row, index) => ({
          rank: index + 1,
          telegramId: row.telegram_id,
          referralCode: row.referral_code,
          totalReferrals: parseInt(row.total_referrals)
        }))
      };

    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get system-wide referral statistics
   */
  async getSystemStats() {
    try {
      const stats = await db.query(
        `SELECT
           COUNT(DISTINCT referrer_id) as total_referrers,
           COUNT(*) as total_referrals,
           COUNT(*) FILTER (WHERE reward_given = TRUE) as rewarded_referrals
         FROM referrals`
      );

      return {
        success: true,
        stats: {
          totalReferrers: parseInt(stats.rows[0].total_referrers),
          totalReferrals: parseInt(stats.rows[0].total_referrals),
          rewardedReferrals: parseInt(stats.rows[0].rewarded_referrals)
        }
      };

    } catch (error) {
      console.error('❌ Error getting system stats:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ReferralService();
