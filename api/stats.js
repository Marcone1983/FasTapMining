const db = require('../database/db');
const viaBTCMiner = require('../mining-engine/viabtc-scrypt-miner');
const { validate, TYPES, commonSchemas } = require('../middleware/validate');
const { rateLimit } = require('../middleware/security');
const logger = require('../utils/logger').loggers.api;

// Rate limiting: 120 requests per minute per IP (public endpoint)
const statsRateLimit = rateLimit({
  windowMs: 60000,
  max: 120,
  keyGenerator: (req) => req.query?.userId || req.ip
});

// Validation schemas for different query combinations
const globalStatsValidation = validate({
  query: {}
});

const poolStatsValidation = validate({
  query: {
    poolId: { type: TYPES.STRING, required: true, pattern: /^[a-z0-9_-]+$/, maxLength: 50 }
  }
});

const leaderboardValidation = validate({
  query: {
    type: { type: TYPES.ENUM, required: true, enum: ['leaderboard'] },
    metric: { type: TYPES.ENUM, required: false, enum: ['blocks', 'taps', 'nfts', 'referrals'] },
    limit: { type: TYPES.INTEGER, required: false, min: 1, max: 1000 }
  }
});

const userStatsValidation = validate({
  query: {
    userId: commonSchemas.userId
  }
});

async function statsHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract from validated or query (middleware handles validation)
  const { poolId, type, userId, metric, limit } = req.validated || req.query;

  try {
    // Get global stats
    if (!poolId && !type) {
      const globalStats = await db.Stats.getGlobal();
      const recentBlocks = await db.Block.getRecent(10);

      // Get REAL mining stats from ViaBTC pool
      const viaBTCStats = viaBTCMiner.getStats();

      return res.json({
        success: true,
        stats: {
          totalMiners: parseInt(globalStats.total_users),
          activeMiners24h: parseInt(globalStats.active_users_24h),
          totalBlocksFound: parseInt(globalStats.total_blocks_found),
          globalHashrate: parseFloat(globalStats.total_hashrate).toFixed(2),
          // REAL MINING STATS from ViaBTC Scrypt pool (8 coins merge mining)
          realMining: {
            viabtc: {
              pool: viaBTCStats.pool,
              host: viaBTCStats.host,
              algorithm: viaBTCStats.algorithm,
              coins: viaBTCStats.coins,
              connected: viaBTCStats.connected,
              hashrate: viaBTCStats.hashrate,
              activeUsers: viaBTCStats.activeUsers,
              difficulty: viaBTCStats.difficulty,
              sharesSubmitted: viaBTCStats.sharesSubmitted,
              sharesAccepted: viaBTCStats.sharesAccepted,
              sharesRejected: viaBTCStats.sharesRejected,
              acceptRate: viaBTCStats.acceptRate,
              earnings: viaBTCStats.earnings
            }
          },
          totalTaps: parseInt(globalStats.total_taps),
          totalDistributed: {
            MineX: parseFloat(globalStats.total_minex_distributed).toFixed(2),
            tBTC: parseFloat(globalStats.total_tbtc_distributed).toFixed(4),
            MRDN: parseFloat(globalStats.total_mrdn_distributed).toFixed(2)
          },
          totalNFTs: parseInt(globalStats.total_nfts_minted),
          totalReferrals: parseInt(globalStats.total_referrals)
        },
        recentBlocks: recentBlocks.map(b => ({
          height: b.height,
          pool: b.pool_name,
          finder: b.finder_username || `User ${b.finder_telegram_id}`,
          reward: parseFloat(b.reward_amount),
          token: b.pool_id === 'minex' ? 'MineX' : b.pool_id === 'tbtc' ? 'tBTC' : 'MRDN',
          nft: b.nft_rewarded,
          timestamp: b.found_at
        }))
      });
    }

    // Get specific pool stats
    if (poolId) {
      const poolStats = await db.Stats.getPoolStats(poolId);
      const poolBlocks = await db.Block.getByPool(poolId, 20);

      if (!poolStats) {
        return res.status(404).json({ error: 'Pool not found' });
      }

      return res.json({
        success: true,
        pool: poolId,
        stats: {
          activeMiners1h: poolStats.active_miners_1h,
          activeMiners24h: poolStats.active_miners_24h,
          blocksFound1h: poolStats.blocks_found_1h,
          blocksFound24h: poolStats.blocks_found_24h,
          avgBlockTime: poolStats.avg_block_time_seconds,
          hashrate1h: parseFloat(poolStats.hashrate_1h).toFixed(2),
          hashrate24h: parseFloat(poolStats.hashrate_24h).toFixed(2)
        },
        recentBlocks: poolBlocks.map(b => ({
          height: b.height,
          finder: b.finder_user_id,
          reward: parseFloat(b.reward_amount),
          nft: b.nft_rewarded,
          timestamp: b.found_at
        }))
      });
    }

    // Get leaderboard
    if (type === 'leaderboard') {
      const leaderboardType = metric || 'blocks';
      const leaderboardLimit = limit || 100;

      const leaderboard = await db.Stats.getLeaderboard(leaderboardType, leaderboardLimit);

      return res.json({
        success: true,
        type: leaderboardType,
        leaderboard: leaderboard.map(entry => ({
          rank: entry.rank,
          userId: entry.id,
          username: entry.username || `User ${entry.id}`,
          value: parseInt(entry.value)
        }))
      });
    }

    // Get user stats
    if (userId) {
      const user = await db.User.findByTelegramId(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userStats = await db.User.getStats(user.id);
      const balances = await db.User.getBalances(user.id);
      const blocks = await db.Block.getUserBlocks(user.id, 10);
      const nfts = await db.NFT.getUserNFTs(user.id);
      const referralStats = await db.Referral.getStats(user.id);
      const achievements = await db.Achievement.getUserAchievements(user.id);
      const dailyReward = await db.DailyReward.get(user.id);
      const autoTap = await db.AutoTap.getActive(user.id);

      return res.json({
        success: true,
        user: {
          id: user.telegram_id,
          username: user.username,
          walletAddress: user.wallet_address,
          hasLifetimeAccess: user.has_lifetime_access,
          referralCode: user.referral_code
        },
        stats: {
          totalTaps: userStats.total_taps,
          totalBlocksFound: userStats.total_blocks_found,
          nftCount: userStats.nft_count,
          referralsCount: userStats.referrals_count,
          achievementsCount: userStats.achievements_count,
          dailyStreak: userStats.daily_streak || 0
        },
        balances: balances,
        recentBlocks: blocks.map(b => ({
          height: b.height,
          pool: b.pool_name,
          reward: parseFloat(b.finder_reward),
          timestamp: b.found_at
        })),
        nfts: nfts.map(nft => ({
          id: nft.id,
          collection: nft.collection,
          character: nft.character,
          rarity: nft.rarity,
          image: nft.image_url,
          minted: nft.minted_at
        })),
        referrals: {
          total: parseInt(referralStats.total_referrals),
          active: parseInt(referralStats.active_referrals),
          totalEarned: parseFloat(referralStats.total_earned)
        },
        achievements: achievements.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          icon: a.icon,
          earned: a.earned_at
        })),
        dailyReward: dailyReward ? {
          currentStreak: dailyReward.current_streak,
          longestStreak: dailyReward.longest_streak,
          lastClaim: dailyReward.last_claim_date,
          nextClaimAt: dailyReward.next_claim_at,
          canClaim: new Date(dailyReward.next_claim_at) < new Date()
        } : null,
        autoTap: autoTap ? {
          tier: autoTap.tier,
          sharesPerSecond: autoTap.shares_per_second,
          activated: autoTap.activated_at,
          expires: autoTap.expires_at,
          isLifetime: autoTap.is_lifetime,
          totalEarned: autoTap.total_earned_shares
        } : null
      });
    }

    return res.status(400).json({ error: 'Invalid request parameters' });

  } catch (error) {
    logger.error('Stats error:', error);
    return res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message
    });
  }
}

// Export with middleware and dynamic validation
module.exports = async (req, res) => {
  // Apply rate limiting first
  return statsRateLimit(req, res, () => {
    // Determine which validation to apply based on query parameters
    const { poolId, type, userId } = req.query;

    let validationMiddleware = globalStatsValidation;
    if (userId) {
      validationMiddleware = userStatsValidation;
    } else if (type === 'leaderboard') {
      validationMiddleware = leaderboardValidation;
    } else if (poolId) {
      validationMiddleware = poolStatsValidation;
    }

    // Apply selected validation and then handler
    return validationMiddleware(req, res, () => {
      return statsHandler(req, res);
    });
  });
};
