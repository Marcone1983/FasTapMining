const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new Telegraf(process.env.TOKEN_API_BOT);
  const { userId, blockData, type } = req.body;

  try {
    if (type === 'block_found') {
      // Notify user about block found
      const message = `
🎉 BLOCK FOUND!

Pool: ${blockData.pool}
Block Height: ${blockData.blockHeight}
Your Reward: ${blockData.finderReward.amount} ${blockData.finderReward.token}

💰 Finder Reward (70%): ${blockData.finderReward.amount} ${blockData.finderReward.token}
👥 Pool Distribution (30%): ${blockData.poolDistribution.length} miners
${blockData.nftReward ? `\n🎨 NFT Bonus: ${blockData.nftReward.character} (${blockData.nftReward.rarity})` : ''}

Hash: ${blockData.hash.slice(0, 16)}...
Difficulty: ${blockData.difficulty}

Keep mining! 🚀
      `.trim();

      await bot.telegram.sendMessage(userId, message);

      // Notify pool contributors
      for (const contributor of blockData.poolDistribution) {
        if (contributor.reward > 0) {
          const poolMsg = `
💎 Pool Reward Received!

Block #${blockData.blockHeight} - ${blockData.pool}
Your Share: ${contributor.shares}
Your Reward: ${contributor.reward.toFixed(4)} ${blockData.finderReward.token}

Total contributed shares help find blocks!
          `.trim();

          await bot.telegram.sendMessage(contributor.userId, poolMsg)
            .catch(() => {}); // Ignore if user blocked bot
        }
      }
    }

    if (type === 'mining_progress') {
      // Optional: Send mining progress updates
      const progressMsg = `
⛏️ Mining Progress

Pool: ${blockData.pool}
Shares: ${blockData.shares}
Pending: ${blockData.pendingShares}
Progress: ${blockData.progress}

Keep tapping! Block reward coming soon! 💪
      `.trim();

      // Only send every 10th update to avoid spam
      if (Math.random() > 0.9) {
        await bot.telegram.sendMessage(userId, progressMsg);
      }
    }

    res.json({ success: true, notified: true });
  } catch (error) {
    console.error('Notification error:', error);
    res.json({ success: false, error: error.message });
  }
};
