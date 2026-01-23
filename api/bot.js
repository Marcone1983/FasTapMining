const { Telegraf } = require('telegraf');

// Initialize bot
const bot = new Telegraf(process.env.TOKEN_API_BOT);

// REQUIRED: /start command (MUST respond in English by default)
bot.command('start', async (ctx) => {
  const firstName = ctx.from.first_name || 'Miner';

  await ctx.reply(
    `⚡ Welcome to FasTapMining, ${firstName}!\n\n` +
    `🚀 Real Multi-Token Mining on TON Blockchain\n\n` +
    `💎 Mine 3 Active Tokens:\n` +
    `• MineX (40% pool weight)\n` +
    `• TonBitcoin/tBTC (30% pool weight)\n` +
    `• Meridian/MRDN (30% pool + NFT drops)\n\n` +
    `⛏️ How it works:\n` +
    `1. Tap to generate mining shares\n` +
    `2. Contribute to pool (SHA-256 hashing)\n` +
    `3. Find blocks & earn rewards!\n` +
    `4. 70% to finder + 30% to all contributors\n\n` +
    `🎨 Bonus: Random NFT drops from Meridian pool\n\n` +
    `📊 Track your rewards in real-time\n` +
    `💰 Claim to your TON wallet anytime\n\n` +
    `Ready to start mining? Click the button below! ⬇️`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ Start Mining', web_app: { url: process.env.WEBAPP_URL || 'https://fas-tap-mining.vercel.app' } }],
          [{ text: '📖 How It Works', callback_data: 'how_it_works' }],
          [{ text: '💰 Token Info', callback_data: 'token_info' }],
          [{ text: '❓ Help & Support', callback_data: 'help' }]
        ]
      }
    }
  );
});

// REQUIRED: /paysupport command (for Telegram Stars payment support)
bot.command('paysupport', async (ctx) => {
  await ctx.reply(
    `💳 Payment Support - FasTapMining\n\n` +
    `All payments are processed through Telegram Stars.\n\n` +
    `📋 Common Questions:\n\n` +
    `❓ How do I purchase items?\n` +
    `• Items are purchased using Telegram Stars\n` +
    `• Tap "Buy" on any item in the app\n` +
    `• Complete payment via Telegram's secure payment system\n\n` +
    `❓ What can I buy with Stars?\n` +
    `• Mining boosts (AutoTap, MultiTap, LuckyTap)\n` +
    `• Premium features\n` +
    `• Special mining equipment\n\n` +
    `❓ Are purchases refundable?\n` +
    `• All Telegram Stars purchases are final\n` +
    `• Refunds only available as required by law\n\n` +
    `❓ How do rewards work?\n` +
    `• Mining rewards are cryptocurrency tokens (MineX, tBTC, MRDN)\n` +
    `• Earned through proof-of-work mining\n` +
    `• Claimed to your TON wallet (not Telegram Stars)\n\n` +
    `❓ I have a payment issue\n` +
    `• Contact: @FasTapMiningSupport\n` +
    `• Or email: support@fastapmining.app\n` +
    `• Include transaction ID and description\n\n` +
    `📄 Read our full payment terms:\n` +
    `https://fas-tap-mining.vercel.app/terms.html\n\n` +
    `⚠️ Note: Cryptocurrency rewards involve risk. Their value can fluctuate. See our Risk Disclaimer for details.`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📖 Terms of Service', url: 'https://fas-tap-mining.vercel.app/terms.html' }],
          [{ text: '🔒 Privacy Policy', url: 'https://fas-tap-mining.vercel.app/privacy.html' }],
          [{ text: '⚠️ Risk Disclaimer', callback_data: 'risk_disclaimer' }],
          [{ text: '↩️ Back to Start', callback_data: 'back_to_start' }]
        ]
      }
    }
  );
});

// /help command
bot.command('help', async (ctx) => {
  await ctx.reply(
    `❓ FasTapMining Help Center\n\n` +
    `📚 Available Commands:\n` +
    `/start - Launch the mining app\n` +
    `/help - Show this help message\n` +
    `/paysupport - Payment support & FAQs\n` +
    `/stats - View your mining statistics\n` +
    `/pools - Information about mining pools\n` +
    `/rewards - Check your reward balance\n\n` +
    `⛏️ How Mining Works:\n` +
    `1. Select a pool (MineX, tBTC, or MRDN)\n` +
    `2. Tap to generate computational shares\n` +
    `3. Your taps create SHA-256 hashes\n` +
    `4. When hash < difficulty → Block found!\n` +
    `5. Earn 70% finder reward + pool distribution\n\n` +
    `💡 Tips:\n` +
    `• Mine regularly for better chances\n` +
    `• Try different pools for variety\n` +
    `• Meridian pool has NFT bonuses!\n` +
    `• Check global stats to see competition\n\n` +
    `Need more help? Contact @FasTapMiningSupport`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ Open App', web_app: { url: process.env.WEBAPP_URL || 'https://fas-tap-mining.vercel.app' } }]
        ]
      }
    }
  );
});

// /stats command
bot.command('stats', async (ctx) => {
  const userId = ctx.from.id;

  // In production, fetch real stats from database
  await ctx.reply(
    `📊 Your Mining Statistics\n\n` +
    `⛏️ Total Taps: Loading...\n` +
    `🎯 Blocks Found: Loading...\n` +
    `💎 Total Rewards Earned:\n` +
    `  • MineX: Loading...\n` +
    `  • tBTC: Loading...\n` +
    `  • MRDN: Loading...\n` +
    `🎨 NFTs Collected: Loading...\n\n` +
    `Use the app to see real-time stats!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 View Full Stats', web_app: { url: process.env.WEBAPP_URL || 'https://fas-tap-mining.vercel.app' } }]
        ]
      }
    }
  );
});

// /pools command
bot.command('pools', async (ctx) => {
  await ctx.reply(
    `💎 Active Mining Pools\n\n` +
    `1️⃣ MineX Pool (40% weight)\n` +
    `Token: MineX\n` +
    `Block Reward: 100 MineX\n` +
    `Difficulty: Medium\n` +
    `Special: Virtual GPU simulation\n` +
    `Contract: EQCLQWTYtsNbk8bn7ed8hqpoxKwXQ1iMGadM8Lae6S-rzNfA\n\n` +
    `2️⃣ TonBitcoin Pool (30% weight)\n` +
    `Token: tBTC\n` +
    `Block Reward: 50 tBTC\n` +
    `Difficulty: Medium-Low\n` +
    `Special: Mine-2-Earn ecosystem\n` +
    `Contract: EQBhF8jWase_Cn1dNTTe_3KMWQQzDbVw_lUUkvW5k6s61ikb\n\n` +
    `3️⃣ Meridian Pool (30% weight)\n` +
    `Token: MRDN\n` +
    `Block Reward: 1000 MRDN\n` +
    `Difficulty: Low\n` +
    `Special: 🎨 Random NFT drops!\n` +
    `Contract: EQCymLRXp1QYxZKek4CTInckB1ey5TkyAJQpPAlNetiO54Vt\n\n` +
    `💡 All tokens are real, listed on TON DEXs (Ston.fi, DeDust)\n\n` +
    `Choose your pool and start mining! ⚡`
  );
});

// Callback query handlers
bot.on('callback_query', async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data === 'how_it_works') {
    await ctx.answerCbQuery();
    await ctx.reply(
      `⛏️ How FasTapMining Works\n\n` +
      `1. SELECT POOL\n` +
      `Choose from MineX, tBTC, or Meridian\n\n` +
      `2. TAP TO MINE\n` +
      `Each tap generates a SHA-256 hash\n` +
      `Hash = SHA256(userID + taps + nonce + block)\n\n` +
      `3. FIND BLOCKS\n` +
      `When your hash < pool difficulty:\n` +
      `🎉 BLOCK FOUND!\n\n` +
      `4. EARN REWARDS\n` +
      `70% → You (the finder)\n` +
      `30% → All pool contributors (by shares)\n\n` +
      `5. CLAIM TOKENS\n` +
      `Accumulate rewards across all pools\n` +
      `Claim to your TON wallet anytime\n\n` +
      `🎨 BONUS: Meridian pool drops random NFTs!\n\n` +
      `This is REAL cryptocurrency mining!`
    );
  }

  if (data === 'token_info') {
    await ctx.answerCbQuery();
    await ctx.reply(
      `💰 Token Information\n\n` +
      `🟢 MineX\n` +
      `• Holders: 4,466+\n` +
      `• Price: ~$0.0000013\n` +
      `• DEX: DeDust\n` +
      `• Bot: @MineXton_bot\n\n` +
      `🟠 TonBitcoin (tBTC)\n` +
      `• Mine-2-Earn ecosystem\n` +
      `• NFT equipment system\n` +
      `• Bot: @tBTCminer_bot\n\n` +
      `🟣 Meridian (MRDN)\n` +
      `• Holders: 11,550+\n` +
      `• Price: ~$0.0006\n` +
      `• DEX: Ston.fi, DeDust\n` +
      `• NFT: Magnetic Meridian collection\n\n` +
      `⚠️ Cryptocurrency prices are volatile.\n` +
      `Values can increase or decrease significantly.\n` +
      `Not financial advice. DYOR!`
    );
  }

  if (data === 'help') {
    await ctx.answerCbQuery();
    await ctx.reply(
      `❓ Need Help?\n\n` +
      `📚 Documentation:\n` +
      `• /help - Command list\n` +
      `• /paysupport - Payment FAQs\n` +
      `• /pools - Pool information\n\n` +
      `💬 Support Channels:\n` +
      `• Telegram: @FasTapMiningSupport\n` +
      `• Email: support@fastapmining.app\n\n` +
      `📄 Legal:\n` +
      `• Terms: /terms\n` +
      `• Privacy: /privacy\n\n` +
      `🐛 Report Issues:\n` +
      `GitHub: github.com/Marcone1983/FasTapMining/issues`
    );
  }

  if (data === 'risk_disclaimer') {
    await ctx.answerCbQuery();
    await ctx.reply(
      `⚠️ RISK DISCLAIMER\n\n` +
      `Cryptocurrency mining and trading involve substantial risk of loss.\n\n` +
      `RISKS INCLUDE:\n` +
      `• Market volatility (prices fluctuate)\n` +
      `• No guaranteed profits\n` +
      `• Blockchain network fees\n` +
      `• Smart contract risks\n` +
      `• Regulatory changes\n\n` +
      `WE DO NOT:\n` +
      `❌ Provide investment advice\n` +
      `❌ Guarantee token values\n` +
      `❌ Promise specific returns\n\n` +
      `YOU ACKNOWLEDGE:\n` +
      `✅ Crypto is high-risk\n` +
      `✅ Only invest what you can afford to lose\n` +
      `✅ DYOR (Do Your Own Research)\n` +
      `✅ You are 18+ years old\n\n` +
      `By using FasTapMining, you accept these risks.\n\n` +
      `Full disclaimer: fas-tap-mining.vercel.app/terms.html`
    );
  }

  if (data === 'back_to_start') {
    await ctx.answerCbQuery();
    // Re-trigger /start command
    return bot.command('start').middleware()(ctx);
  }
});

// Export for serverless
module.exports = async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Bot error:', error);
    res.status(500).json({ error: error.message });
  }
};

// For local development
if (require.main === module) {
  bot.launch();
  console.log('✅ Bot started');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}
