const crypto = require('crypto');
const db = require('../database/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, taps, poolId, nonce } = req.body;

  if (!userId || !taps || !poolId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get pool from database
    const { rows: [pool] } = await db.query(
      'SELECT * FROM mining_pools WHERE id = $1 AND is_active = TRUE',
      [poolId]
    );

    if (!pool) {
      return res.status(400).json({ error: 'Invalid or inactive pool' });
    }

    // Get or create user
    let user = await db.User.findByTelegramId(userId);
    if (!user) {
      // Auto-create user if doesn't exist
      user = await db.User.create({
        telegram_id: userId,
        username: `user_${userId}`,
        referral_code: generateReferralCode(userId)
      });
    }

    // Calculate shares from taps
    const shares = Math.floor(taps * parseFloat(pool.weight) * 10);
    const hashrate = shares / 1000; // Simple hashrate calculation

    // Add shares to database
    await db.Mining.addShares(user.id, poolId, shares, 1, hashrate);

    // Generate hash for Proof-of-Work
    const hash = generateHash(user.id, taps, nonce, pool.current_height);
    const hashValue = parseInt(hash.slice(0, 16), 16);

    // Check if block found
    const blockFound = hashValue < parseInt(pool.difficulty);

    if (blockFound) {
      // 🎉 BLOCK FOUND! Process rewards
      return await processBlockFound(res, {
        user,
        pool,
        hash,
        hashValue,
        nonce,
        shares
      });
    }

    // Block not found - return current progress
    const userShares = await db.Mining.getUserShares(user.id, poolId);
    const progress = (hashValue / parseInt(pool.difficulty) * 100).toFixed(4);

    return res.json({
      success: true,
      blockFound: false,
      shares: shares,
      pool: pool.name,
      token: pool.token,
      pendingShares: userShares,
      hashValue: hashValue,
      difficulty: pool.difficulty,
      progress: progress + '%',
      hashrate: hashrate.toFixed(2)
    });

  } catch (error) {
    console.error('Mining error:', error);
    return res.status(500).json({
      error: 'Mining failed',
      message: error.message
    });
  }
};

async function processBlockFound(res, data) {
  const { user, pool, hash, hashValue, nonce } = data;

  try {
    return await db.transaction(async (client) => {
      // Calculate rewards
      const finderReward = parseFloat(pool.block_reward) * 0.7; // 70%
      const poolReward = parseFloat(pool.block_reward) * 0.3;   // 30%

      const newHeight = parseInt(pool.current_height) + 1;

      // Generate NFT if pool has NFT rewards
      let nftData = null;
      let nftId = null;

      if (pool.has_nft_rewards) {
        nftData = generateNFTReward();
        const nft = await db.NFT.create(user.id, {
          collection: 'Magnetic Meridian',
          character: nftData.character,
          rarity: nftData.rarity,
          image_url: `https://fastapmining.vercel.app/nfts/${nftData.character.toLowerCase()}.png`,
          metadata: { block_height: newHeight, rarity_score: getRarityScore(nftData.rarity) }
        });
        nftId = nft.id;
      }

      // Create block record
      const block = await db.Block.create({
        pool_id: pool.id,
        height: newHeight,
        finder_user_id: user.id,
        hash: hash,
        nonce: nonce,
        difficulty: pool.difficulty,
        reward_amount: pool.block_reward,
        finder_reward: finderReward,
        pool_reward: poolReward,
        nft_rewarded: !!nftData,
        nft_id: nftId
      });

      // Give finder reward immediately
      await db.User.updateBalance(user.id, pool.token, finderReward, 'add');

      // Distribute pool rewards to all contributors
      const distributions = await db.Mining.distributePoolRewards(
        block.id,
        pool.id,
        poolReward
      );

      // Update global stats
      await db.Stats.updateGlobal();

      // Check and award achievements
      const newAchievements = await db.Achievement.check(user.id);

      // Create notification for block found
      await db.Notification.create(
        user.id,
        'block_found',
        '🎉 Block Found!',
        `You found block #${newHeight} in ${pool.name} pool and earned ${finderReward} ${pool.token}!`,
        {
          block_id: block.id,
          pool: pool.name,
          reward: finderReward,
          nft: nftData
        }
      );

      // Notify pool contributors
      for (const dist of distributions) {
        if (dist.user_id !== user.id) {
          await db.Notification.create(
            dist.user_id,
            'pool_reward',
            '💰 Pool Reward',
            `You earned ${dist.reward.toFixed(4)} ${pool.token} from block #${newHeight}`,
            {
              block_id: block.id,
              pool: pool.name,
              reward: dist.reward
            }
          );
        }
      }

      // Notify achievements
      for (const achievement of newAchievements) {
        await db.Notification.create(
          user.id,
          'achievement',
          '🏆 Achievement Unlocked!',
          `${achievement.name}: ${achievement.description}`,
          {
            achievement_id: achievement.id,
            reward: achievement.reward
          }
        );
      }

      // Invalidate caches
      await db.invalidateCache('blocks:*');
      await db.invalidateCache('pool:*');
      await db.invalidateCache('stats:*');
      await db.invalidateCache(`user:${user.id}:*`);

      return res.json({
        success: true,
        blockFound: true,
        blockHeight: newHeight,
        pool: pool.name,
        finderReward: {
          amount: finderReward,
          token: pool.token,
          userId: user.telegram_id
        },
        poolDistribution: distributions.map(d => ({
          userId: d.user_id,
          reward: d.reward,
          token: pool.token
        })),
        nftReward: nftData,
        hash: hash,
        hashValue: hashValue,
        difficulty: pool.difficulty,
        newAchievements: newAchievements.map(a => ({
          id: a.id,
          name: a.name,
          icon: a.icon
        }))
      });
    });

  } catch (error) {
    console.error('Block processing error:', error);
    return res.status(500).json({
      error: 'Block processing failed',
      message: error.message
    });
  }
}

function generateHash(userId, taps, nonce, blockHeight) {
  const data = `${userId}:${taps}:${nonce}:${blockHeight}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateNFTReward() {
  const characters = [
    { name: 'Astronaut', weight: 40 },
    { name: 'Warrior', weight: 30 },
    { name: 'Mage', weight: 15 },
    { name: 'Robot', weight: 10 },
    { name: 'Dragon', weight: 5 }
  ];

  const rarities = [
    { name: 'Common', weight: 60 },
    { name: 'Rare', weight: 25 },
    { name: 'Epic', weight: 12 },
    { name: 'Legendary', weight: 3 }
  ];

  const character = weightedRandom(characters);
  const rarity = weightedRandom(rarities);

  return {
    type: 'Magnetic Meridian',
    character: character,
    rarity: rarity,
    id: crypto.randomBytes(8).toString('hex')
  };
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    if (random < item.weight) {
      return item.name;
    }
    random -= item.weight;
  }

  return items[0].name;
}

function getRarityScore(rarity) {
  const scores = {
    'Common': 1,
    'Rare': 5,
    'Epic': 20,
    'Legendary': 100
  };
  return scores[rarity] || 1;
}

function generateReferralCode(userId) {
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}

// Background worker: Clean expired shares every 5 minutes
setInterval(async () => {
  try {
    const deleted = await db.Mining.clearExpiredShares();
    if (deleted > 0) {
      console.log(`✅ Cleared ${deleted} expired mining shares`);
    }
  } catch (error) {
    console.error('Clear expired shares error:', error);
  }
}, 300000);

// Background worker: Deactivate expired AutoTaps every 10 minutes
setInterval(async () => {
  try {
    const deactivated = await db.AutoTap.deactivateExpired();
    if (deactivated > 0) {
      console.log(`✅ Deactivated ${deactivated} expired AutoTap subscriptions`);
    }
  } catch (error) {
    console.error('Deactivate AutoTap error:', error);
  }
}, 600000);

// Background worker: Update global stats every 2 minutes
setInterval(async () => {
  try {
    await db.Stats.updateGlobal();
    console.log('✅ Global stats updated');
  } catch (error) {
    console.error('Update global stats error:', error);
  }
}, 120000);
