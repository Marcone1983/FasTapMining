const { Address } = require('@ton/core');

// Wallet addresses for each token
const TOKEN_WALLETS = {
  MineX: 'EQCLQWTYtsNbk8bn7ed8hqpoxKwXQ1iMGadM8Lae6S-rzNfA',
  tBTC: 'EQBhF8jWase_Cn1dNTTe_3KMWQQzDbVw_lUUkvW5k6s61ikb',
  MRDN: 'EQCymLRXp1QYxZKek4CTInckB1ey5TkyAJQpPAlNetiO54Vt'
};

// User rewards (in production use database)
const userRewards = new Map();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { userId, walletAddress } = req.body;

    if (!userId || !walletAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user accumulated rewards
    const rewards = userRewards.get(userId) || {
      MineX: 0,
      tBTC: 0,
      MRDN: 0,
      nfts: []
    };

    // Validate TON wallet address
    try {
      Address.parse(walletAddress);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid TON wallet address' });
    }

    // Calculate total value
    const totalValue = calculateTotalValue(rewards);

    // Minimum claim threshold
    if (totalValue < 1) {
      return res.status(400).json({
        error: 'Minimum claim threshold not met',
        threshold: 1,
        current: totalValue,
        rewards: rewards
      });
    }

    // ✅ APPLY 5% ROYALTY TO OWNER WALLET
    const OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
    const ROYALTY_PERCENT = 0.05; // 5%

    // Create payout transactions with royalty deduction
    const transactions = [];
    const royaltyTransactions = [];

    for (const [token, amount] of Object.entries(rewards)) {
      if (token === 'nfts') continue;
      if (amount > 0) {
        // Calculate royalty
        const royaltyAmount = amount * ROYALTY_PERCENT;
        const netAmount = amount - royaltyAmount;

        // User transaction (95%)
        transactions.push({
          token: token,
          amount: netAmount,
          to: walletAddress,
          from: TOKEN_WALLETS[token],
          status: 'pending',
          note: '95% of claimed amount (5% royalty deducted)'
        });

        // Royalty transaction (5% to owner)
        royaltyTransactions.push({
          token: token,
          amount: royaltyAmount,
          to: OWNER_WALLET,
          from: TOKEN_WALLETS[token],
          status: 'pending',
          note: '5% platform royalty'
        });
      }
    }

    // Clear user rewards after claim
    userRewards.delete(userId);

    return res.json({
      success: true,
      claimed: true,
      transactions: transactions,
      royaltyTransactions: royaltyTransactions,
      nfts: rewards.nfts,
      totalValue: totalValue,
      royaltyDeducted: totalValue * ROYALTY_PERCENT,
      netValue: totalValue * (1 - ROYALTY_PERCENT),
      message: 'Rewards claimed! Tokens will arrive in 1-5 minutes. (5% platform fee applied)'
    });
  }

  if (req.method === 'GET') {
    // Get user balance
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const rewards = userRewards.get(userId) || {
      MineX: 0,
      tBTC: 0,
      MRDN: 0,
      nfts: []
    };

    const totalValue = calculateTotalValue(rewards);

    return res.json({
      success: true,
      rewards: rewards,
      totalValue: totalValue,
      canClaim: totalValue >= 1
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function calculateTotalValue(rewards) {
  // Approximate USD value (in production use real-time prices)
  const prices = {
    MineX: 0.0000013,
    tBTC: 0.00005,
    MRDN: 0.0006
  };

  let total = 0;
  for (const [token, amount] of Object.entries(rewards)) {
    if (token === 'nfts') continue;
    total += amount * (prices[token] || 0);
  }

  return total;
}

// Helper function to add rewards (called from mining.js)
function addReward(userId, token, amount, nft = null) {
  const current = userRewards.get(userId) || {
    MineX: 0,
    tBTC: 0,
    MRDN: 0,
    nfts: []
  };

  current[token] = (current[token] || 0) + amount;

  if (nft) {
    current.nfts.push(nft);
  }

  userRewards.set(userId, current);
}

module.exports.addReward = addReward;
module.exports.userRewards = userRewards;
