// Global mining statistics
const stats = {
  totalMiners: 0,
  totalBlocksFound: 0,
  totalRewardsDistributed: {
    MineX: 0,
    tBTC: 0,
    MRDN: 0
  },
  poolHashrate: {
    minex: 0,
    tbtc: 0,
    mrdn: 0
  },
  recentBlocks: [],
  topMiners: []
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Calculate global hashrate
    const globalHashrate = Object.values(stats.poolHashrate)
      .reduce((sum, h) => sum + h, 0);

    // Get pool distribution
    const poolDistribution = {
      minex: {
        name: 'MineX',
        token: 'MineX',
        weight: '40%',
        hashrate: stats.poolHashrate.minex,
        blocks: stats.recentBlocks.filter(b => b.pool === 'MineX').length,
        totalRewards: stats.totalRewardsDistributed.MineX
      },
      tbtc: {
        name: 'TonBitcoin',
        token: 'tBTC',
        weight: '30%',
        hashrate: stats.poolHashrate.tbtc,
        blocks: stats.recentBlocks.filter(b => b.pool === 'TonBitcoin').length,
        totalRewards: stats.totalRewardsDistributed.tBTC
      },
      mrdn: {
        name: 'Meridian',
        token: 'MRDN',
        weight: '30%',
        hashrate: stats.poolHashrate.mrdn,
        blocks: stats.recentBlocks.filter(b => b.pool === 'Meridian').length,
        totalRewards: stats.totalRewardsDistributed.MRDN,
        nftDrops: stats.recentBlocks.filter(b => b.pool === 'Meridian' && b.nft).length
      }
    };

    return res.json({
      success: true,
      stats: {
        totalMiners: stats.totalMiners,
        totalBlocksFound: stats.totalBlocksFound,
        globalHashrate: globalHashrate,
        pools: poolDistribution,
        recentBlocks: stats.recentBlocks.slice(0, 10),
        topMiners: stats.topMiners.slice(0, 20)
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// Helper functions to update stats
function updateStats(type, data) {
  switch (type) {
    case 'block_found':
      stats.totalBlocksFound++;
      stats.totalRewardsDistributed[data.token] += data.reward;
      stats.recentBlocks.unshift({
        height: data.blockHeight,
        pool: data.pool,
        finder: data.finder,
        reward: data.reward,
        token: data.token,
        nft: data.nft || null,
        timestamp: Date.now()
      });
      // Keep only last 100 blocks
      if (stats.recentBlocks.length > 100) {
        stats.recentBlocks = stats.recentBlocks.slice(0, 100);
      }
      break;

    case 'miner_active':
      stats.totalMiners = data.count;
      break;

    case 'hashrate_update':
      stats.poolHashrate[data.pool] = data.hashrate;
      break;

    case 'top_miners_update':
      stats.topMiners = data.miners;
      break;
  }
}

module.exports.updateStats = updateStats;
module.exports.stats = stats;
