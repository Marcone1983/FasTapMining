const crypto = require('crypto');

// Mining Pool Configuration
const POOLS = {
  minex: {
    name: 'MineX',
    weight: 0.40,
    difficulty: 1000000,
    blockReward: 100,
    token: 'MineX'
  },
  tbtc: {
    name: 'TonBitcoin',
    weight: 0.30,
    difficulty: 800000,
    blockReward: 50,
    token: 'tBTC'
  },
  mrdn: {
    name: 'Meridian',
    weight: 0.30,
    difficulty: 500000,
    blockReward: 1000,
    token: 'MRDN',
    hasNFT: true
  }
};

// Global mining state (in production use Redis/DB)
const globalState = {
  totalHashrate: 0,
  activeMiners: new Map(),
  pendingShares: new Map(),
  blockHeight: 0
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, taps, poolId, nonce } = req.body;

  if (!userId || !taps || !poolId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const pool = POOLS[poolId];
  if (!pool) {
    return res.status(400).json({ error: 'Invalid pool' });
  }

  // Convert taps to computational shares
  const shares = calculateShares(taps, pool.weight);

  // Generate hash from user taps
  const hash = generateHash(userId, taps, nonce, globalState.blockHeight);
  const hashValue = parseInt(hash.slice(0, 16), 16);

  // Check if block found
  const blockFound = hashValue < pool.difficulty;

  // Update user contribution
  const userKey = `${userId}-${poolId}`;
  const currentShares = globalState.pendingShares.get(userKey) || 0;
  globalState.pendingShares.set(userKey, currentShares + shares);

  if (blockFound) {
    // BLOCK FOUND! Distribute rewards
    const finderReward = pool.blockReward * 0.7; // 70% to finder
    const poolReward = pool.blockReward * 0.3;   // 30% to pool

    // Calculate pool distribution based on shares
    const totalPoolShares = Array.from(globalState.pendingShares.values())
      .reduce((sum, s) => sum + s, 0);

    const poolDistribution = distributePoolRewards(
      poolReward,
      globalState.pendingShares,
      userKey
    );

    // Clear pending shares for this pool
    globalState.pendingShares.clear();
    globalState.blockHeight++;

    // Generate NFT if Meridian pool
    const nftReward = pool.hasNFT ? generateNFTReward() : null;

    return res.json({
      success: true,
      blockFound: true,
      blockHeight: globalState.blockHeight,
      pool: pool.name,
      finderReward: {
        amount: finderReward,
        token: pool.token,
        userId: userId
      },
      poolDistribution: poolDistribution,
      nftReward: nftReward,
      hash: hash,
      hashValue: hashValue,
      difficulty: pool.difficulty
    });
  }

  // Block not found, but shares contributed
  return res.json({
    success: true,
    blockFound: false,
    shares: shares,
    pool: pool.name,
    token: pool.token,
    pendingShares: globalState.pendingShares.get(userKey),
    hashValue: hashValue,
    difficulty: pool.difficulty,
    progress: (hashValue / pool.difficulty * 100).toFixed(2) + '%'
  });
};

function calculateShares(taps, weight) {
  // Each tap contributes to mining shares based on pool weight
  return Math.floor(taps * weight * 10);
}

function generateHash(userId, taps, nonce, blockHeight) {
  // Real hash generation (SHA-256 like Bitcoin)
  const data = `${userId}:${taps}:${nonce}:${blockHeight}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

function distributePoolRewards(poolReward, pendingShares, finderKey) {
  const distribution = [];
  const totalShares = Array.from(pendingShares.values())
    .reduce((sum, s) => sum + s, 0);

  for (const [key, shares] of pendingShares.entries()) {
    if (key === finderKey) continue; // Finder already got 70%

    const userReward = (shares / totalShares) * poolReward;
    distribution.push({
      userId: key.split('-')[0],
      shares: shares,
      reward: userReward
    });
  }

  return distribution;
}

function generateNFTReward() {
  // Random NFT generation for Meridian pool
  const characters = ['Astronaut', 'Warrior', 'Mage', 'Robot', 'Dragon'];
  const rarity = ['Common', 'Rare', 'Epic', 'Legendary'];

  const randomChar = characters[Math.floor(Math.random() * characters.length)];
  const randomRarity = rarity[Math.floor(Math.random() * rarity.length)];

  return {
    type: 'Magnetic Meridian',
    character: randomChar,
    rarity: randomRarity,
    id: crypto.randomBytes(8).toString('hex')
  };
}
