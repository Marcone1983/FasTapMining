// Production-ready PostgreSQL connection pool with retry logic
const { Pool } = require('pg');
const { createClient } = require('redis');

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'fastap_mining',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  maxUses: 7500, // Close connection after 7500 uses
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

// Redis client for caching
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
  }
});

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('Redis connected'));

// Initialize Redis connection
(async () => {
  try {
    await redis.connect();
  } catch (err) {
    console.error('Redis connection failed:', err);
  }
})();

// Query wrapper with automatic retry
async function query(text, params, retries = 3) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (err) {
      lastError = err;
      console.error(`Query attempt ${attempt}/${retries} failed:`, err.message);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError;
}

// Transaction wrapper
async function transaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Cache wrapper
async function cached(key, ttl, fetchFn) {
  if (!redis.isOpen) {
    return await fetchFn();
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await fetchFn();
    await redis.setEx(key, ttl, JSON.stringify(result));

    return result;
  } catch (err) {
    console.error('Cache error:', err);
    return await fetchFn();
  }
}

// Invalidate cache by pattern
async function invalidateCache(pattern) {
  if (!redis.isOpen) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.error('Cache invalidation error:', err);
  }
}

// Database health check
async function healthCheck() {
  try {
    const { rows } = await query('SELECT NOW()');
    return {
      database: 'healthy',
      redis: redis.isOpen ? 'healthy' : 'disconnected',
      timestamp: rows[0].now
    };
  } catch (err) {
    return {
      database: 'error',
      redis: redis.isOpen ? 'healthy' : 'disconnected',
      error: err.message
    };
  }
}

// User queries
const User = {
  async findByTelegramId(telegramId) {
    const { rows } = await query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );
    return rows[0];
  },

  async findById(userId) {
    return await cached(`user:${userId}`, 300, async () => {
      const { rows } = await query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return rows[0];
    });
  },

  async create(data) {
    const { rows } = await query(
      `INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, referred_by_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.telegram_id, data.username, data.first_name, data.last_name, data.referral_code, data.referred_by_id]
    );

    await invalidateCache(`user:${rows[0].id}`);
    return rows[0];
  },

  async update(userId, updates) {
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    const { rows } = await query(
      `UPDATE users SET ${setClause}, last_active_at = NOW() WHERE id = $1 RETURNING *`,
      [userId, ...Object.values(updates)]
    );

    await invalidateCache(`user:${userId}`);
    return rows[0];
  },

  async grantLifetimeAccess(userId, txHash) {
    return await this.update(userId, {
      has_lifetime_access: true,
      lifetime_access_tx_hash: txHash,
      lifetime_access_paid_at: new Date()
    });
  },

  async connectWallet(userId, walletAddress) {
    return await this.update(userId, { wallet_address: walletAddress });
  },

  async getStats(userId) {
    return await cached(`user:${userId}:stats`, 60, async () => {
      const { rows } = await query(
        'SELECT * FROM v_user_stats WHERE id = $1',
        [userId]
      );
      return rows[0];
    });
  },

  async getBalances(userId) {
    const { rows } = await query(
      'SELECT * FROM user_balances WHERE user_id = $1',
      [userId]
    );

    const balances = {};
    rows.forEach(row => {
      balances[row.token] = {
        balance: parseFloat(row.balance),
        lifetime_earned: parseFloat(row.lifetime_earned),
        lifetime_claimed: parseFloat(row.lifetime_claimed)
      };
    });

    return balances;
  },

  async updateBalance(userId, token, amount, operation = 'add') {
    return await transaction(async (client) => {
      const op = operation === 'add' ? '+' : '-';

      const { rows } = await client.query(
        `INSERT INTO user_balances (user_id, token, balance, lifetime_earned)
         VALUES ($1, $2, $3, $3)
         ON CONFLICT (user_id, token)
         DO UPDATE SET
           balance = user_balances.balance ${op} $3,
           lifetime_earned = user_balances.lifetime_earned + $3,
           last_updated_at = NOW()
         RETURNING *`,
        [userId, token, Math.abs(amount)]
      );

      await invalidateCache(`user:${userId}:*`);
      return rows[0];
    });
  }
};

// Block queries
const Block = {
  async create(blockData) {
    return await transaction(async (client) => {
      // Insert block
      const { rows: [block] } = await client.query(
        `INSERT INTO blocks (pool_id, height, finder_user_id, hash, nonce, difficulty,
                            reward_amount, finder_reward, pool_reward, nft_rewarded, nft_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [blockData.pool_id, blockData.height, blockData.finder_user_id, blockData.hash,
         blockData.nonce, blockData.difficulty, blockData.reward_amount, blockData.finder_reward,
         blockData.pool_reward, blockData.nft_rewarded, blockData.nft_id]
      );

      // Update pool height
      await client.query(
        `UPDATE mining_pools
         SET current_height = $1, total_blocks_found = total_blocks_found + 1
         WHERE id = $2`,
        [blockData.height, blockData.pool_id]
      );

      // Update user stats
      await client.query(
        'UPDATE users SET total_blocks_found = total_blocks_found + 1 WHERE id = $1',
        [blockData.finder_user_id]
      );

      await invalidateCache('blocks:*');
      await invalidateCache('pool:*');
      await invalidateCache('stats:*');

      return block;
    });
  },

  async getRecent(limit = 50) {
    return await cached(`blocks:recent:${limit}`, 30, async () => {
      const { rows } = await query(
        'SELECT * FROM v_recent_blocks LIMIT $1',
        [limit]
      );
      return rows;
    });
  },

  async getByPool(poolId, limit = 100) {
    const { rows } = await query(
      `SELECT * FROM blocks WHERE pool_id = $1 ORDER BY found_at DESC LIMIT $2`,
      [poolId, limit]
    );
    return rows;
  },

  async getUserBlocks(userId, limit = 50) {
    const { rows } = await query(
      `SELECT b.*, p.name as pool_name
       FROM blocks b
       JOIN mining_pools p ON b.pool_id = p.id
       WHERE b.finder_user_id = $1
       ORDER BY b.found_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }
};

// Mining queries
const Mining = {
  async addShares(userId, poolId, shares, taps, hashrate) {
    const { rows } = await query(
      `INSERT INTO mining_shares (user_id, pool_id, shares, taps, hashrate, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour')
       RETURNING *`,
      [userId, poolId, shares, taps, hashrate]
    );

    // Update user taps
    await query(
      'UPDATE users SET total_taps = total_taps + $1 WHERE id = $2',
      [taps, userId]
    );

    await invalidateCache(`user:${userId}:*`);
    return rows[0];
  },

  async getUserShares(userId, poolId) {
    const { rows } = await query(
      `SELECT COALESCE(SUM(shares), 0) as total_shares
       FROM mining_shares
       WHERE user_id = $1 AND pool_id = $2 AND expires_at > NOW()`,
      [userId, poolId]
    );
    return parseInt(rows[0].total_shares);
  },

  async getPoolShares(poolId) {
    const { rows } = await query(
      `SELECT user_id, SUM(shares) as shares
       FROM mining_shares
       WHERE pool_id = $1 AND expires_at > NOW()
       GROUP BY user_id`,
      [poolId]
    );
    return rows;
  },

  async clearExpiredShares() {
    const { rowCount } = await query(
      'DELETE FROM mining_shares WHERE expires_at < NOW()'
    );
    return rowCount;
  },

  async distributePoolRewards(blockId, poolId, totalReward) {
    const poolShares = await this.getPoolShares(poolId);

    if (poolShares.length === 0) return [];

    const totalShares = poolShares.reduce((sum, ps) => sum + parseInt(ps.shares), 0);

    return await transaction(async (client) => {
      const distributions = [];

      for (const ps of poolShares) {
        const userShare = parseInt(ps.shares) / totalShares;
        const reward = totalReward * userShare;

        if (reward > 0) {
          await client.query(
            `INSERT INTO user_balances (user_id, token, balance, lifetime_earned)
             VALUES ($1, (SELECT token FROM mining_pools WHERE id = $2), $3, $3)
             ON CONFLICT (user_id, token)
             DO UPDATE SET
               balance = user_balances.balance + $3,
               lifetime_earned = user_balances.lifetime_earned + $3`,
            [ps.user_id, poolId, reward]
          );

          distributions.push({ user_id: ps.user_id, reward });
        }
      }

      await client.query(
        'UPDATE blocks SET distributed_at = NOW() WHERE id = $1',
        [blockId]
      );

      return distributions;
    });
  }
};

// NFT queries
const NFT = {
  async create(userId, nftData) {
    const { rows } = await query(
      `INSERT INTO nfts (user_id, collection, character, rarity, image_url, metadata, block_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, nftData.collection, nftData.character, nftData.rarity,
       nftData.image_url, nftData.metadata, nftData.block_id]
    );

    await invalidateCache(`user:${userId}:nfts`);
    return rows[0];
  },

  async getUserNFTs(userId) {
    return await cached(`user:${userId}:nfts`, 120, async () => {
      const { rows } = await query(
        `SELECT * FROM nfts WHERE user_id = $1 ORDER BY minted_at DESC`,
        [userId]
      );
      return rows;
    });
  },

  async getById(nftId) {
    const { rows } = await query(
      'SELECT * FROM nfts WHERE id = $1',
      [nftId]
    );
    return rows[0];
  }
};

// AutoTap queries
const AutoTap = {
  async create(userId, tierData, paymentTxHash) {
    const { rows } = await query(
      `INSERT INTO autotap_subscriptions
       (user_id, tier, shares_per_second, expires_at, is_lifetime, payment_tx_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, tierData.tier, tierData.sharesPerSecond, tierData.expiresAt,
       tierData.isLifetime, paymentTxHash]
    );

    await invalidateCache(`user:${userId}:autotap`);
    return rows[0];
  },

  async getActive(userId) {
    return await cached(`user:${userId}:autotap`, 10, async () => {
      const { rows } = await query(
        `SELECT * FROM autotap_subscriptions
         WHERE user_id = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY activated_at DESC
         LIMIT 1`,
        [userId]
      );
      return rows[0];
    });
  },

  async claim(userId) {
    return await transaction(async (client) => {
      const { rows: [sub] } = await client.query(
        `SELECT * FROM autotap_subscriptions
         WHERE user_id = $1 AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
         LIMIT 1`,
        [userId]
      );

      if (!sub) throw new Error('No active AutoTap');

      const elapsed = Math.floor((Date.now() - new Date(sub.last_claim_at).getTime()) / 1000);
      const shares = sub.shares_per_second * elapsed;

      if (shares > 0) {
        await client.query(
          `UPDATE autotap_subscriptions
           SET last_claim_at = NOW(),
               accumulated_shares = 0,
               total_earned_shares = total_earned_shares + $1
           WHERE id = $2`,
          [shares, sub.id]
        );

        await invalidateCache(`user:${userId}:autotap`);
        return { shares, subscription: sub };
      }

      return { shares: 0, subscription: sub };
    });
  },

  async deactivateExpired() {
    const { rowCount } = await query(
      `UPDATE autotap_subscriptions
       SET is_active = FALSE
       WHERE is_active = TRUE AND expires_at < NOW() AND is_lifetime = FALSE`
    );
    return rowCount;
  }
};

// Referral queries
const Referral = {
  async create(referrerId, referredId, referralCode) {
    return await transaction(async (client) => {
      const { rows: [ref] } = await client.query(
        `INSERT INTO referrals (referrer_id, referred_id, referral_code)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [referrerId, referredId, referralCode]
      );

      // Get referral rewards config
      const { rows: [config] } = await client.query(
        `SELECT value FROM system_config WHERE key = 'referral_rewards'`
      );

      const rewards = config.value;

      // Give rewards to referrer
      for (const [token, amount] of Object.entries(rewards.referrer)) {
        await client.query(
          `INSERT INTO user_balances (user_id, token, balance, lifetime_earned)
           VALUES ($1, $2, $3, $3)
           ON CONFLICT (user_id, token)
           DO UPDATE SET
             balance = user_balances.balance + $3,
             lifetime_earned = user_balances.lifetime_earned + $3`,
          [referrerId, token, amount]
        );

        await client.query(
          `INSERT INTO referral_rewards (referral_id, user_id, token, amount, reward_type)
           VALUES ($1, $2, $3, $4, 'referrer')`,
          [ref.id, referrerId, token, amount]
        );
      }

      // Give rewards to referred
      for (const [token, amount] of Object.entries(rewards.referred)) {
        await client.query(
          `INSERT INTO user_balances (user_id, token, balance, lifetime_earned)
           VALUES ($1, $2, $3, $3)
           ON CONFLICT (user_id, token)
           DO UPDATE SET
             balance = user_balances.balance + $3,
             lifetime_earned = user_balances.lifetime_earned + $3`,
          [referredId, token, amount]
        );

        await client.query(
          `INSERT INTO referral_rewards (referral_id, user_id, token, amount, reward_type)
           VALUES ($1, $2, $3, $4, 'referred')`,
          [ref.id, referredId, token, amount]
        );
      }

      await client.query(
        'UPDATE referrals SET rewards_paid = TRUE WHERE id = $1',
        [ref.id]
      );

      await invalidateCache(`user:${referrerId}:*`);
      await invalidateCache(`user:${referredId}:*`);

      return ref;
    });
  },

  async getUserReferrals(userId) {
    return await cached(`user:${userId}:referrals`, 60, async () => {
      const { rows } = await query(
        `SELECT r.*, u.username, u.telegram_id, u.created_at as joined_at
         FROM referrals r
         JOIN users u ON r.referred_id = u.id
         WHERE r.referrer_id = $1 AND r.is_active = TRUE
         ORDER BY r.joined_at DESC`,
        [userId]
      );
      return rows;
    });
  },

  async getStats(userId) {
    const { rows } = await query(
      `SELECT
         COUNT(*) as total_referrals,
         COUNT(*) FILTER (WHERE u.last_active_at > NOW() - INTERVAL '7 days') as active_referrals,
         COALESCE(SUM(rr.amount) FILTER (WHERE rr.reward_type = 'referrer'), 0) as total_earned
       FROM referrals r
       LEFT JOIN users u ON r.referred_id = u.id
       LEFT JOIN referral_rewards rr ON r.id = rr.referral_id AND rr.user_id = $1
       WHERE r.referrer_id = $1 AND r.is_active = TRUE`,
      [userId]
    );
    return rows[0];
  }
};

// Achievement queries
const Achievement = {
  async check(userId) {
    const stats = await User.getStats(userId);
    const { rows: achievements } = await query(
      'SELECT * FROM achievements WHERE is_active = TRUE'
    );

    const earned = [];

    for (const achievement of achievements) {
      const req = achievement.requirement;
      let qualifies = false;

      if (req.blocks && stats.total_blocks_found >= req.blocks) qualifies = true;
      if (req.taps && stats.total_taps >= req.taps) qualifies = true;
      if (req.referrals && stats.referrals_count >= req.referrals) qualifies = true;
      if (req.nfts && stats.nft_count >= req.nfts) qualifies = true;

      if (qualifies) {
        const { rows: [existing] } = await query(
          'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
          [userId, achievement.id]
        );

        if (!existing) {
          await query(
            'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
            [userId, achievement.id]
          );
          earned.push(achievement);
        }
      }
    }

    await invalidateCache(`user:${userId}:achievements`);
    return earned;
  },

  async getUserAchievements(userId) {
    return await cached(`user:${userId}:achievements`, 300, async () => {
      const { rows } = await query(
        `SELECT a.*, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.earned_at DESC`,
        [userId]
      );
      return rows;
    });
  }
};

// Stats queries
const Stats = {
  async getGlobal() {
    return await cached('stats:global', 30, async () => {
      const { rows } = await query('SELECT * FROM global_stats WHERE id = 1');
      return rows[0];
    });
  },

  async updateGlobal() {
    await query(`
      UPDATE global_stats SET
        total_users = (SELECT COUNT(*) FROM users),
        active_users_24h = (SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours'),
        total_blocks_found = (SELECT COUNT(*) FROM blocks),
        total_taps = (SELECT COALESCE(SUM(total_taps), 0) FROM users),
        total_nfts_minted = (SELECT COUNT(*) FROM nfts),
        total_referrals = (SELECT COUNT(*) FROM referrals WHERE is_active = TRUE),
        updated_at = NOW()
      WHERE id = 1
    `);

    await invalidateCache('stats:*');
  },

  async getPoolStats(poolId) {
    return await cached(`stats:pool:${poolId}`, 60, async () => {
      const { rows } = await query(
        'SELECT * FROM pool_stats_cache WHERE pool_id = $1',
        [poolId]
      );
      return rows[0];
    });
  },

  async getLeaderboard(type = 'blocks', limit = 100) {
    return await cached(`leaderboard:${type}:${limit}`, 120, async () => {
      let query_text;

      switch (type) {
        case 'blocks':
          query_text = `
            SELECT u.id, u.username, COUNT(b.id) as value, RANK() OVER (ORDER BY COUNT(b.id) DESC) as rank
            FROM users u
            JOIN blocks b ON u.id = b.finder_user_id
            GROUP BY u.id
            ORDER BY value DESC
            LIMIT $1
          `;
          break;
        case 'taps':
          query_text = `
            SELECT id, username, total_taps as value, RANK() OVER (ORDER BY total_taps DESC) as rank
            FROM users
            WHERE total_taps > 0
            ORDER BY value DESC
            LIMIT $1
          `;
          break;
        case 'referrals':
          query_text = `
            SELECT u.id, u.username, COUNT(r.id) as value, RANK() OVER (ORDER BY COUNT(r.id) DESC) as rank
            FROM users u
            JOIN referrals r ON u.id = r.referrer_id AND r.is_active = TRUE
            GROUP BY u.id
            ORDER BY value DESC
            LIMIT $1
          `;
          break;
        default:
          throw new Error('Invalid leaderboard type');
      }

      const { rows } = await query(query_text, [limit]);
      return rows;
    });
  }
};

// Transaction queries
const Transaction = {
  async create(txData) {
    const { rows } = await query(
      `INSERT INTO transactions (user_id, tx_type, token, amount, from_address, to_address,
                                 tx_hash, status, block_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [txData.user_id, txData.tx_type, txData.token, txData.amount, txData.from_address,
       txData.to_address, txData.tx_hash, txData.status || 'pending', txData.block_id, txData.metadata]
    );

    await invalidateCache(`user:${txData.user_id}:transactions`);
    return rows[0];
  },

  async updateStatus(txId, status, txHash) {
    const { rows } = await query(
      `UPDATE transactions SET status = $1, tx_hash = $2, confirmed_at = NOW() WHERE id = $3 RETURNING *`,
      [status, txHash, txId]
    );

    return rows[0];
  },

  async getUserTransactions(userId, limit = 50) {
    const { rows } = await query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return rows;
  }
};

// Notification queries
const Notification = {
  async create(userId, type, title, message, data = null) {
    const { rows } = await query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, type, title, message, data]
    );

    await invalidateCache(`user:${userId}:notifications`);
    return rows[0];
  },

  async getUserNotifications(userId, unreadOnly = false) {
    const whereClause = unreadOnly ? 'AND is_read = FALSE' : '';

    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ${whereClause} ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    return rows;
  },

  async markRead(notificationId) {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = $1',
      [notificationId]
    );
  },

  async markAllRead(userId) {
    await query(
      'UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    await invalidateCache(`user:${userId}:notifications`);
  }
};

// Daily rewards
const DailyReward = {
  async claim(userId) {
    return await transaction(async (client) => {
      const { rows: [dr] } = await client.query(
        `INSERT INTO daily_rewards (user_id, current_streak, longest_streak, last_claim_date, total_claims, next_claim_at)
         VALUES ($1, 1, 1, CURRENT_DATE, 1, NOW() + INTERVAL '24 hours')
         ON CONFLICT (user_id) DO UPDATE SET
           current_streak = CASE
             WHEN daily_rewards.last_claim_date = CURRENT_DATE - 1 THEN daily_rewards.current_streak + 1
             WHEN daily_rewards.last_claim_date = CURRENT_DATE THEN daily_rewards.current_streak
             ELSE 1
           END,
           longest_streak = GREATEST(daily_rewards.longest_streak,
             CASE
               WHEN daily_rewards.last_claim_date = CURRENT_DATE - 1 THEN daily_rewards.current_streak + 1
               ELSE 1
             END
           ),
           last_claim_date = CASE
             WHEN daily_rewards.last_claim_date = CURRENT_DATE THEN daily_rewards.last_claim_date
             ELSE CURRENT_DATE
           END,
           total_claims = daily_rewards.total_claims + 1,
           next_claim_at = CASE
             WHEN daily_rewards.last_claim_date = CURRENT_DATE THEN daily_rewards.next_claim_at
             ELSE NOW() + INTERVAL '24 hours'
           END
         RETURNING *`,
        [userId]
      );

      if (dr.last_claim_date < new Date().toISOString().split('T')[0]) {
        return { claimed: false, message: 'Already claimed today', data: dr };
      }

      // Get multiplier
      const { rows: [config] } = await client.query(
        `SELECT value FROM system_config WHERE key = 'daily_reward_multipliers'`
      );

      const multipliers = config.value;
      const streakIndex = Math.min(dr.current_streak - 1, multipliers.length - 1);
      const multiplier = multipliers[streakIndex];
      const baseReward = 100;
      const reward = baseReward * multiplier;

      // Give MineX reward
      await client.query(
        `INSERT INTO user_balances (user_id, token, balance, lifetime_earned)
         VALUES ($1, 'MineX', $2, $2)
         ON CONFLICT (user_id, token)
         DO UPDATE SET
           balance = user_balances.balance + $2,
           lifetime_earned = user_balances.lifetime_earned + $2`,
        [userId, reward]
      );

      await invalidateCache(`user:${userId}:*`);

      return {
        claimed: true,
        reward,
        multiplier,
        streak: dr.current_streak,
        data: dr
      };
    });
  },

  async get(userId) {
    const { rows } = await query(
      'SELECT * FROM daily_rewards WHERE user_id = $1',
      [userId]
    );
    return rows[0];
  }
};

module.exports = {
  pool,
  redis,
  query,
  transaction,
  cached,
  invalidateCache,
  healthCheck,
  User,
  Block,
  Mining,
  NFT,
  AutoTap,
  Referral,
  Achievement,
  Stats,
  Transaction,
  Notification,
  DailyReward
};
