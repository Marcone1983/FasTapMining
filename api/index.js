const { Telegraf } = require('telegraf');

// Simple HTML/XSS sanitization for Telegram messages
function sanitizeText(text) {
  if (typeof text !== 'string') {
    return String(text);
  }
  // Remove HTML tags and special characters that could cause issues
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/[`]/g, "'") // Replace backticks
    .substring(0, 1000); // Limit length
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const bot = new Telegraf(process.env.TOKEN_API_BOT);
  const { userId, blockData, type } = req.body;

  // Validate userId
  if (!userId || (typeof userId !== 'number' && typeof userId !== 'string')) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  try {
    if (type === 'block_found') {
      // Sanitize all user-controlled data
      const pool = sanitizeText(blockData.pool);
      const token = sanitizeText(blockData.finderReward.token);
      const amount = parseFloat(blockData.finderReward.amount).toFixed(4);
      const blockHeight = parseInt(blockData.blockHeight);
      const hash = sanitizeText(blockData.hash).slice(0, 16);
      
      // Notify user about block found
      const message = `
🎉 BLOCK FOUND!

Pool: ${pool}
Block Height: ${blockHeight}
Your Reward: ${amount} ${token}

💰 Finder Reward (70%): ${amount} ${token}
👥 Pool Distribution (30%): ${blockData.poolDistribution.length} miners
${blockData.nftReward ? `\n🎨 NFT Bonus: ${sanitizeText(blockData.nftReward.character)} (${sanitizeText(blockData.nftReward.rarity)})` : ''}

Hash: ${hash}...
Difficulty: ${blockData.difficulty}

Keep mining! 🚀
      `.trim();

      await bot.telegram.sendMessage(userId, message);

      // Notify pool contributors
      for (const contributor of blockData.poolDistribution) {
        if (contributor.reward > 0 && contributor.userId) {
          const poolMsg = `
💎 Pool Reward Received!

Block #${blockHeight} - ${pool}
Your Share: ${parseInt(contributor.shares)}
Your Reward: ${parseFloat(contributor.reward).toFixed(4)} ${token}

Total contributed shares help find blocks!
          `.trim();

          await bot.telegram.sendMessage(contributor.userId, poolMsg)
            .catch(() => {}); // Ignore if user blocked bot
        }
      }
    }

    if (type === 'mining_progress') {
      // Sanitize progress data
      const pool = sanitizeText(blockData.pool);
      const shares = parseInt(blockData.shares);
      const pendingShares = parseInt(blockData.pendingShares);
      const progress = sanitizeText(blockData.progress);
      
      // Optional: Send mining progress updates
      const progressMsg = `
⛏️ Mining Progress

Pool: ${pool}
Shares: ${shares}
Pending: ${pendingShares}
Progress: ${progress}

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
