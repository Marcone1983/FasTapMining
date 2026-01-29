const path = require('path');
const logger = require('../utils/logger').loggers.bot;
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TelegramBot = require('node-telegram-bot-api');
const db = require('../database/db');
const lifetimeAccessService = require('../services/lifetime-access-service');
const marketplaceService = require('../services/marketplace-service');
const referralService = require('../services/referral-service');

// Verify bot token
if (!process.env.TOKEN_API_BOT) {
  logger.error('❌ ERROR: TOKEN_API_BOT not found in environment variables!');
  logger.error('📁 Make sure .env file exists in project root with TOKEN_API_BOT=your_token');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(process.env.TOKEN_API_BOT, { polling: true });
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://fas-tap-mining.vercel.app';

// Initialize REAL mining engine - Connect to ViaBTC pool
const viaBTCMiner = require('../mining-engine/viabtc-scrypt-miner');
viaBTCMiner.initialize().then(() => {
  logger.info('⛏️ ViaBTC Scrypt pool connected - REAL mining active!');
}).catch(err => {
  logger.error('❌ CRITICAL: ViaBTC pool connection FAILED!');
  logger.error('Error:', err.message);
  logger.error('Stack:', err.stack);
  logger.error('\n⚠️  Mining engine CANNOT function without pool connection.');
  logger.error('⚠️  Bot will continue for user management, but mining is DISABLED.');
  logger.error('⚠️  FIX THE CONNECTION IMMEDIATELY!\n');
  // Do NOT exit - allow bot to handle user queries, but mining won't work
});

logger.info('🤖 FasTap Mining Bot Started!');
logger.info(`📱 Web App URL: ${WEBAPP_URL}`);
logger.info(`✅ Bot Token: ${process.env.TOKEN_API_BOT.slice(0, 10)}...`);

// Owner wallet for automatic admin access
const OWNER_WALLET = process.env.OWNER_WALLET_TON || 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
// Owner Telegram IDs - HARDCODED per riconoscimento immediato
const HARDCODED_OWNERS = ['856208904'];
const ENV_OWNERS = (process.env.OWNER_TELEGRAM_IDS || '').split(',').filter(id => id.trim());
const OWNER_TELEGRAM_IDS = [...HARDCODED_OWNERS, ...ENV_OWNERS];

// Generate referral code for user
function generateReferralCode(userId) {
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}

// Check if user is owner by wallet address
async function isOwner(telegramId) {
  try {
    const user = await db.User.findByTelegramId(telegramId.toString());
    if (!user || !user.wallet_address) return false;

    // Normalize wallet addresses (remove spaces, convert to uppercase for comparison)
    const userWallet = user.wallet_address.replace(/\s/g, '').toUpperCase();
    const ownerWallet = OWNER_WALLET.replace(/\s/g, '').toUpperCase();

    return userWallet === ownerWallet;
  } catch (error) {
    logger.error('Error checking owner status:', error);
    return false;
  }
}

// Start command - Handle referrals and auto-detect owner
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const username = msg.from.username || msg.from.first_name;
  const referrerCode = match[1] ? match[1].trim() : null;

  try {
    // Get or create user
    let user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      // Generate referral code for new user
      const newUserCode = generateReferralCode(telegramId);

      user = await db.User.create({
        telegram_id: telegramId,
        username: username,
        first_name: msg.from.first_name || '',
        referral_code: newUserCode
      });
      logger.info(`✨ New user created: ${telegramId} with referral code: ${newUserCode}`);

      // Process referral if code provided (user joined via someone's referral link)
      if (referrerCode) {
        const referralResult = await referralService.processReferral(telegramId, referrerCode);

        if (referralResult.success) {
          bot.sendMessage(chatId,
            `🤝 *Referral Activated!*\n\n` +
            `You joined via referral code: \`${referrerCode}\`\n\n` +
            `*Reward Distribution:*\n` +
            `💎 You receive: 85% of your mining rewards\n` +
            `🎁 Your referrer gets: 10% of your mining rewards\n` +
            `👑 Platform fee: 5%\n\n` +
            `⛏️ Example: Pool pays 1 LTC\n` +
            `   • You keep: 0.855 LTC (85%)\n` +
            `   • Referrer gets: 0.095 LTC (10%)\n` +
            `   • Platform: 0.05 LTC (5%)\n\n` +
            `Start mining now! 🚀`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    }

    // Check if user is owner (automatic admin access)
    const ownerAccess = await isOwner(telegramId);

    // Also check by Telegram ID
    const isOwnerByTelegramId = OWNER_TELEGRAM_IDS.includes(telegramId.toString());
    const hasOwnerPrivileges = ownerAccess || isOwnerByTelegramId;

    // If user is owner but doesn't have lifetime access in DB, grant it automatically
    if (hasOwnerPrivileges && !user.has_lifetime_access) {
      await db.query(
        'UPDATE users SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW() WHERE id = $1',
        [user.id]
      );
      logger.info(`✅ Owner detected - Lifetime access auto-granted to ${telegramId}`);
      user.has_lifetime_access = true;
    }

    if (hasOwnerPrivileges) {
      // Owner detected - show admin dashboard automatically
      const adminKeyboard = {
        inline_keyboard: [
          [
            { text: '👑 Admin Dashboard', callback_data: 'admin_dashboard' }
          ],
          [
            { text: '⛏️ Start Mining', web_app: { url: WEBAPP_URL } }
          ],
          [
            { text: '💰 My Balance', callback_data: 'balance' },
            { text: '📊 Statistics', callback_data: 'stats' }
          ]
        ]
      };

      return bot.sendMessage(chatId,
        `👑 *Welcome, Owner!*\n\n` +
        `🔐 You have full admin access.\n` +
        `💎 Platform is ready for you.\n\n` +
        `Use the Admin Dashboard button to manage the platform.`,
        { parse_mode: 'Markdown', reply_markup: adminKeyboard }
      );
    }

    // Regular user flow
    const hasAccess = user.has_lifetime_access;

    // PAYWALL NEL BOT: Mini app si apre SOLO se hai lifetime access!
    const keyboard = {
      inline_keyboard: [
        // Mostra "Start Mining" SOLO se ha lifetime access
        ...(hasAccess ? [[{ text: '⛏️ Start Mining', web_app: { url: WEBAPP_URL } }]] : []),
        [
          { text: '💰 My Balance', callback_data: 'balance' },
          { text: '📊 Statistics', callback_data: 'stats' }
        ],
        [
          { text: '🛒 Marketplace', callback_data: 'marketplace' },
          { text: '👥 Referrals', callback_data: 'referral' }
        ],
        // Mostra "Get Lifetime Access" SOLO se NON ha access
        ...(!hasAccess ? [[{ text: '🔥 Unlock Mining - Pay 1 TON', callback_data: 'lifetime' }]] : [])
      ]
    };

    const welcomeMessage = hasAccess
      ? `🎉 *Welcome back, ${username}!*\n\n` +
        `⛏️ *Status:* Lifetime Access Active\n` +
        `💎 *Mining:* ${user.hashrate || 0} H/s\n\n` +
        `Tap the button below to start mining!`
      : `👋 *Welcome to FasTap Mining!*\n\n` +
        `⛏️ Mine *8 real cryptocurrencies* by tapping!\n` +
        `💰 LTC, DOGE, TON, BELLS, LKY, PEP, JKC, DINGO\n\n` +
        `🔓 *Get Lifetime Access* for just 1 TON!\n` +
        `✅ Unlimited mining forever\n` +
        `✅ AutoTap features\n` +
        `✅ Multipliers & boosts\n\n` +
        `Tap below to get started! 👇`;

    bot.sendMessage(chatId, welcomeMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    logger.error('Error in /start:', error);
    bot.sendMessage(chatId, '❌ Error starting bot. Please try again.');
  }
});

// Balance command
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    const balances = user.balances || {};
    let message = `💰 *Your Crypto Balances*\n\n`;

    const coins = ['LTC', 'DOGE', 'TON', 'BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];

    for (const coin of coins) {
      const balance = balances[coin] || 0;
      if (balance > 0) {
        message += `${coin}: \`${balance.toFixed(8)}\`\n`;
      }
    }

    message += `\n💎 *Total Hashrate:* ${user.hashrate || 0} H/s`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in /balance:', error);
    bot.sendMessage(chatId, '❌ Error fetching balance.');
  }
});

// Stats command
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    const stats = await referralService.getUserReferralStats(telegramId);
    const activeItems = await marketplaceService.getUserActiveItems(user.id);

    let message = `📊 *Your Statistics*\n\n`;
    message += `⛏️ *Hashrate:* ${user.hashrate || 0} H/s\n`;
    message += `⏱️ *Joined:* ${user.created_at.toLocaleDateString()}\n`;
    message += `🔓 *Lifetime Access:* ${user.has_lifetime_access ? '✅ Active' : '❌ Not purchased'}\n\n`;

    if (activeItems.length > 0) {
      message += `🚀 *Active Boosts:*\n`;
      activeItems.forEach(item => {
        message += `• ${item.itemName}`;
        if (!item.isPermanent) {
          message += ` (${item.daysRemaining} days left)`;
        }
        message += `\n`;
      });
      message += `\n`;
    }

    if (stats.success && stats.stats.totalReferrals > 0) {
      message += `👥 *Referrals:* ${stats.stats.totalReferrals}\n`;
      message += `🎁 *Earned from Referrals:*\n`;
      const earned = stats.stats.earnedRewards;
      if (earned.LTC > 0) message += `  LTC: ${earned.LTC}\n`;
      if (earned.DOGE > 0) message += `  DOGE: ${earned.DOGE}\n`;
      if (earned.TON > 0) message += `  TON: ${earned.TON}\n`;
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in /stats:', error);
    bot.sendMessage(chatId, '❌ Error fetching statistics.');
  }
});

// Marketplace command
bot.onText(/\/marketplace/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId,
    `🛒 *Marketplace - Boost Your Mining!*\n\n` +
    `Choose a category to browse items:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ AutoTap Tiers (Permanent)', callback_data: 'shop_autotap' }],
          [{ text: '🚀 Hashrate Multipliers (30 days)', callback_data: 'shop_multiplier' }],
          [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
        ]
      }
    }
  );
});

// Referral command
bot.onText(/\/referral/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const result = await referralService.getUserReferralCode(telegramId);

    if (!result.success) {
      return bot.sendMessage(chatId, '❌ Error getting referral code.');
    }

    let message = `👥 *Referral Program - NEW SYSTEM!*\n\n`;
    message += `*Your Referral Code:* \`${result.referralCode}\`\n`;
    message += `*Your Referral Link:*\n${result.referralUrl}\n\n`;
    message += `*💰 How it works:*\n`;
    message += `✅ *You get:* 10% of ALL your friend's mining rewards!\n`;
    message += `✅ *Your friend:* Mines normally (85% after fees)\n`;
    message += `✅ *Platform:* 5% fee supports development\n\n`;
    message += `*Example:* Friend mines 100 TON\n`;
    message += `  → Friend receives: 85 TON\n`;
    message += `  → You receive: 10 TON (10% bonus!)\n`;
    message += `  → Platform: 5 TON (5% fee)\n\n`;
    message += `🎁 *Passive income forever!*\nEarn from every block your friends find!`;

    const stats = await referralService.getUserReferralStats(telegramId);
    if (stats.success && stats.stats.totalReferrals > 0) {
      message += `\n\n📊 *Your Stats:*\n`;
      message += `Total Referrals: ${stats.stats.totalReferrals}\n`;
      message += `Total Earned:\n`;
      const earned = stats.stats.earnedRewards;
      if (earned.LTC > 0) message += `  LTC: ${earned.LTC}\n`;
      if (earned.DOGE > 0) message += `  DOGE: ${earned.DOGE}\n`;
      if (earned.TON > 0) message += `  TON: ${earned.TON}\n`;
    }

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 Share Referral Link', switch_inline_query: `Join FasTap Mining and earn crypto! ${result.referralUrl}` }]
        ]
      }
    });

  } catch (error) {
    logger.error('Error in /referral:', error);
    bot.sendMessage(chatId, '❌ Error fetching referral info.');
  }
});

// Show my Telegram ID command
bot.onText(/\/myid/, (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || 'N/A';

  bot.sendMessage(chatId,
    `🆔 *Your Telegram Info*\n\n` +
    `*Telegram ID:* \`${telegramId}\`\n` +
    `*Username:* @${username}\n\n` +
    `Use this ID to set yourself as owner in environment variables.`,
    { parse_mode: 'Markdown' }
  );
});

// Help command
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  const message = `
📖 *FasTap Mining - Help*

*Commands:*
/start - Start mining and view dashboard
/balance - Check your crypto balances
/stats - View your mining statistics
/marketplace - Browse boost items
/referral - Get your referral code
/help - Show this help message

*How to Mine:*
1. Tap the "Start Mining" button
2. Tap on the screen to mine
3. Earn real cryptocurrencies!

*Features:*
⛏️ Mine 8 real coins simultaneously
💰 Automatic TON conversion
🚀 AutoTap for passive mining
📈 Multipliers to boost earnings
👥 Referral rewards

*Support:*
Email: support@fas-tap-mining.com
Telegram: @FasTapMiningSupport

*Powered by ViaBTC mining pool* 💎
  `;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

// Mine command
bot.onText(/\/mine/, (msg) => {
  const chatId = msg.chat.id;

  const keyboard = {
    inline_keyboard: [
      [{ text: '⛏️ Start Mining', web_app: { url: WEBAPP_URL } }]
    ]
  };

  bot.sendMessage(chatId,
    `⛏️ *Start Mining!*\n\n` +
    `Tap the button below to open the mining interface.\n\n` +
    `You'll be able to:\n` +
    `• Tap to mine 8 cryptocurrencies\n` +
    `• View your real-time earnings\n` +
    `• Track your hashrate\n` +
    `• Claim your rewards`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// Claim command
bot.onText(/\/claim/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    if (!user.wallet_ton) {
      return bot.sendMessage(chatId,
        `❌ *Wallet Not Connected*\n\n` +
        `Please connect your TON wallet first using /wallet or open the mining app.`,
        { parse_mode: 'Markdown' }
      );
    }

    const balances = user.balances || {};
    let totalValue = 0;
    let hasBalance = false;

    const coins = ['LTC', 'DOGE', 'TON', 'BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];

    for (const coin of coins) {
      if (balances[coin] && balances[coin] > 0) {
        hasBalance = true;
        break;
      }
    }

    if (!hasBalance) {
      return bot.sendMessage(chatId,
        `💰 *No Rewards to Claim*\n\n` +
        `Keep mining to earn rewards!\n` +
        `Use /mine to start mining.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Here you would trigger actual claim logic
    bot.sendMessage(chatId,
      `💰 *Claim Rewards*\n\n` +
      `Open the mining app to claim your rewards.\n` +
      `Your rewards will be sent to:\n` +
      `\`${user.wallet_ton}\``,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '💰 Claim Now', web_app: { url: WEBAPP_URL } }]
          ]
        }
      }
    );

  } catch (error) {
    logger.error('Error in /claim:', error);
    bot.sendMessage(chatId, '❌ Error processing claim request.');
  }
});

// Wallet command
bot.onText(/\/wallet/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    let message = `💼 *Your Wallets*\n\n`;

    if (user.wallet_ton) {
      message += `*TON Wallet:*\n\`${user.wallet_ton}\`\n\n`;
    } else {
      message += `❌ *TON Wallet:* Not connected\n\n`;
    }

    message += `*Scrypt Coin Wallets:*\n`;
    const scryptCoins = ['BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];

    scryptCoins.forEach(coin => {
      const walletKey = `wallet_${coin.toLowerCase()}`;
      if (user[walletKey]) {
        message += `${coin}: \`${user[walletKey]}\`\n`;
      } else {
        message += `${coin}: Not set\n`;
      }
    });

    message += `\n💡 Connect wallets in the mining app to receive rewards.`;

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔗 Connect Wallets', web_app: { url: WEBAPP_URL } }]
        ]
      }
    });

  } catch (error) {
    logger.error('Error in /wallet:', error);
    bot.sendMessage(chatId, '❌ Error fetching wallet information.');
  }
});

// AutoTap command
bot.onText(/\/autotap/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    // Check active AutoTap subscription
    const autotapResult = await db.query(
      `SELECT *
       FROM marketplace_purchases
       WHERE user_id = $1
       AND item_type LIKE 'autotap_%'
       AND status = 'confirmed'
       AND (expires_on IS NULL OR expires_on > NOW())
       ORDER BY activated_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (autotapResult.rows.length > 0) {
      const autotap = autotapResult.rows[0];
      const isPermanent = !autotap.expires_on;

      // Get item details from marketplace service
      const itemDetails = marketplaceService.getMarketplaceItems().find(item => item.id === autotap.item_type);
      const itemName = itemDetails ? itemDetails.name : autotap.item_type;
      const itemDescription = itemDetails ? itemDetails.description : 'AutoTap subscription';

      let message = `⚡ *AutoTap Active!*\n\n`;
      message += `*Tier:* ${itemName}\n`;
      message += `*Effect:* ${itemDescription}\n`;
      message += `*Status:* ${isPermanent ? '👑 Permanent' : `📅 Expires ${new Date(autotap.expires_on).toLocaleDateString()}`}\n\n`;
      message += `Your mining continues automatically even when you're not tapping!`;

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId,
        `⚡ *AutoTap Not Active*\n\n` +
        `Activate AutoTap to mine automatically without tapping!\n\n` +
        `*Benefits:*\n` +
        `• Passive mining 24/7\n` +
        `• Multiple tiers available\n` +
        `• Permanent upgrades\n\n` +
        `Check /marketplace to purchase AutoTap!`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 View AutoTap Tiers', callback_data: 'marketplace' }]
            ]
          }
        }
      );
    }

  } catch (error) {
    logger.error('Error in /autotap:', error);
    bot.sendMessage(chatId, '❌ Error fetching AutoTap information.');
  }
});

// Boosts command
bot.onText(/\/boosts/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    const activeBoosts = await db.query(
      `SELECT *
       FROM marketplace_purchases
       WHERE user_id = $1
       AND status = 'confirmed'
       AND (expires_on IS NULL OR expires_on > NOW())
       ORDER BY activated_at DESC`,
      [user.id]
    );

    if (activeBoosts.rows.length === 0) {
      return bot.sendMessage(chatId,
        `🚀 *No Active Boosts*\n\n` +
        `Purchase boosts from the marketplace to enhance your mining!\n\n` +
        `Use /marketplace to see available boosts.`,
        { parse_mode: 'Markdown' }
      );
    }

    let message = `🚀 *Your Active Boosts*\n\n`;

    // Get marketplace items for details
    const marketplaceItems = marketplaceService.getMarketplaceItems();

    activeBoosts.rows.forEach((boost, index) => {
      const isPermanent = !boost.expires_on;

      // Get item details from marketplace service
      const itemDetails = marketplaceItems.find(item => item.id === boost.item_type);
      const itemName = itemDetails ? itemDetails.name : boost.item_type;
      const itemDescription = itemDetails ? itemDetails.description : 'Boost active';

      message += `${index + 1}. *${itemName}*\n`;
      message += `   ${itemDescription}\n`;
      message += `   Status: ${isPermanent ? '👑 Permanent' : `📅 ${Math.ceil((new Date(boost.expires_on) - new Date()) / (1000 * 60 * 60 * 24))} days left`}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in /boosts:', error);
    bot.sendMessage(chatId, '❌ Error fetching boosts.');
  }
});

// Leaderboard command
bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const topMiners = await db.query(
      `SELECT username, hashrate, total_shares, blocks_found
       FROM users
       WHERE hashrate > 0
       ORDER BY hashrate DESC
       LIMIT 10`
    );

    if (topMiners.rows.length === 0) {
      return bot.sendMessage(chatId, '👑 *Leaderboard*\n\nNo miners yet. Be the first!', { parse_mode: 'Markdown' });
    }

    let message = `👑 *Top Miners Leaderboard*\n\n`;

    topMiners.rows.forEach((miner, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      message += `${medal} *${miner.username || 'Anonymous'}*\n`;
      message += `   ⚡ ${miner.hashrate} H/s | 📦 ${miner.blocks_found} blocks\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in /leaderboard:', error);
    bot.sendMessage(chatId, '❌ Error fetching leaderboard.');
  }
});

// Settings command
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();

  try {
    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
    }

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🔗 Manage Wallets', callback_data: 'wallet' },
          { text: '🔔 Notifications', callback_data: 'notifications' }
        ],
        [
          { text: '📊 View Statistics', callback_data: 'stats' },
          { text: '❓ Help', callback_data: 'help' }
        ]
      ]
    };

    let message = `⚙️ *Settings*\n\n`;
    message += `*Account:* @${user.username || telegramId}\n`;
    message += `*Lifetime Access:* ${user.has_lifetime_access ? '✅ Active' : '❌ Not purchased'}\n`;
    message += `*Hashrate:* ${user.hashrate || 0} H/s\n`;
    message += `*Member Since:* ${new Date(user.created_at).toLocaleDateString()}\n\n`;
    message += `Select an option below:`;

    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

  } catch (error) {
    logger.error('Error in /settings:', error);
    bot.sendMessage(chatId, '❌ Error loading settings.');
  }
});

// Set bot commands menu
bot.setMyCommands([
  { command: 'start', description: '🚀 Start mining and view dashboard' },
  { command: 'mine', description: '⛏️ Open mining interface' },
  { command: 'balance', description: '💰 Check your crypto balances' },
  { command: 'claim', description: '💎 Claim your mining rewards' },
  { command: 'wallet', description: '💼 Manage your wallets' },
  { command: 'stats', description: '📊 View your mining statistics' },
  { command: 'marketplace', description: '🛒 Browse boost items' },
  { command: 'autotap', description: '⚡ Check AutoTap status' },
  { command: 'boosts', description: '🚀 View active boosts' },
  { command: 'referral', description: '🤝 Get your referral code' },
  { command: 'leaderboard', description: '👑 View top miners' },
  { command: 'settings', description: '⚙️ Account settings' },
  { command: 'help', description: '❓ Show help message' }
]).then(() => {
  logger.info('✅ Bot commands menu set successfully');
}).catch(err => {
  logger.error('❌ Error setting bot commands:', err);
});

// ============================================
// ADMIN DASHBOARD
// ============================================

const ADMIN_KEY = process.env.ADMIN_KEY;

function isAdmin(adminKey) {
  return adminKey && adminKey === ADMIN_KEY;
}

// Admin main menu
bot.onText(/\/admin (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📊 Platform Stats', callback_data: `admin_stats_${adminKey}` },
        { text: '👥 Users', callback_data: `admin_users_${adminKey}` }
      ],
      [
        { text: '💰 Fees Collected', callback_data: `admin_fees_${adminKey}` },
        { text: '💳 Payments', callback_data: `admin_payments_${adminKey}` }
      ],
      [
        { text: '🏥 Health Check', callback_data: `admin_health_${adminKey}` },
        { text: '💸 Trigger Payout', callback_data: `admin_payout_${adminKey}` }
      ]
    ]
  };

  bot.sendMessage(chatId,
    `👑 *Admin Dashboard*\n\n` +
    `Welcome to FasTap Mining admin panel.\n` +
    `Select an option below:`,
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );
});

// Admin Stats
bot.onText(/\/admin_stats (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;

    const lifetimeUsersResult = await db.query('SELECT COUNT(*) as count FROM users WHERE has_lifetime_access = true');
    const lifetimeUsers = lifetimeUsersResult.rows[0].count;

    const activeUsersResult = await db.query(`SELECT COUNT(*) as count FROM users WHERE last_active > NOW() - INTERVAL '24 hours'`);
    const activeUsers = activeUsersResult.rows[0].count;

    const hashrateResult = await db.query('SELECT COALESCE(SUM(hashrate), 0) as total FROM users');
    const totalHashrate = parseFloat(hashrateResult.rows[0].total);

    const feesResult = await db.query(`SELECT coin, SUM(amount) as total FROM platform_fees WHERE paid_out = false GROUP BY coin`);

    let feesMessage = '';
    feesResult.rows.forEach(row => {
      feesMessage += `  ${row.coin}: ${parseFloat(row.total).toFixed(8)}\n`;
    });

    const revenueResult = await db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM lifetime_access_payments WHERE status = 'confirmed'`);
    const totalPayments = revenueResult.rows[0].count;
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    const marketplaceResult = await db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM marketplace_purchases WHERE status = 'confirmed'`);
    const marketplacePurchases = marketplaceResult.rows[0].count;
    const marketplaceRevenue = parseFloat(marketplaceResult.rows[0].total);

    const message = `
📊 *Platform Statistics*

👥 *Users:*
Total Users: ${totalUsers}
Lifetime Access: ${lifetimeUsers}
Active (24h): ${activeUsers}

⛏️ *Mining:*
Total Hashrate: ${totalHashrate.toFixed(2)} H/s

💰 *Fees Collected (Pending):*
${feesMessage || '  No pending fees'}

💳 *Revenue:*
Lifetime Access: ${totalPayments} payments (${totalRevenue.toFixed(4)} TON)
Marketplace: ${marketplacePurchases} purchases (${marketplaceRevenue.toFixed(4)} TON)
*Total Revenue:* ${(totalRevenue + marketplaceRevenue).toFixed(4)} TON
    `;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in admin_stats:', error);
    bot.sendMessage(chatId, '❌ Error fetching statistics.');
  }
});

// Admin Users
bot.onText(/\/admin_users (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    const recentUsersResult = await db.query(`SELECT telegram_id, username, hashrate, has_lifetime_access, created_at FROM users ORDER BY created_at DESC LIMIT 20`);

    let message = `👥 *Recent Users (Last 20)*\n\n`;

    recentUsersResult.rows.forEach((user, index) => {
      const status = user.has_lifetime_access ? '✅' : '🔓';
      message += `${index + 1}. ${status} @${user.username || user.telegram_id}\n`;
      message += `   Hashrate: ${user.hashrate || 0} H/s\n`;
      message += `   Joined: ${new Date(user.created_at).toLocaleDateString()}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in admin_users:', error);
    bot.sendMessage(chatId, '❌ Error fetching users.');
  }
});

// Admin Fees
bot.onText(/\/admin_fees (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    const feesResult = await db.query(`SELECT coin, SUM(amount) as total, COUNT(*) as count FROM platform_fees WHERE paid_out = false GROUP BY coin`);

    let message = `💰 *Platform Fees (Pending)*\n\n`;

    feesResult.rows.forEach(row => {
      message += `*${row.coin}:*\n`;
      message += `  Amount: ${parseFloat(row.total).toFixed(8)}\n`;
      message += `  Transactions: ${row.count}\n\n`;
    });

    const paidFeesResult = await db.query(`SELECT coin, SUM(amount) as total FROM platform_fees WHERE paid_out = true GROUP BY coin`);

    if (paidFeesResult.rows.length > 0) {
      message += `✅ *Already Paid Out:*\n`;
      paidFeesResult.rows.forEach(row => {
        message += `  ${row.coin}: ${parseFloat(row.total).toFixed(8)}\n`;
      });
    }

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in admin_fees:', error);
    bot.sendMessage(chatId, '❌ Error fetching fees.');
  }
});

// Admin Payments
bot.onText(/\/admin_payments (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    const paymentsResult = await db.query(`
      SELECT lp.*, u.username
      FROM lifetime_access_payments lp
      JOIN users u ON lp.user_id = u.id
      ORDER BY lp.created_at DESC
      LIMIT 20
    `);

    let message = `💳 *Recent Lifetime Access Payments*\n\n`;

    paymentsResult.rows.forEach((payment, index) => {
      const statusIcon = payment.status === 'confirmed' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';
      message += `${index + 1}. ${statusIcon} @${payment.username}\n`;
      message += `   Amount: ${payment.amount} TON\n`;
      message += `   Status: ${payment.status}\n`;
      message += `   Date: ${new Date(payment.created_at).toLocaleString()}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in admin_payments:', error);
    bot.sendMessage(chatId, '❌ Error fetching payments.');
  }
});

// Admin Health Check
bot.onText(/\/admin_health (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    let message = `🏥 *System Health Check*\n\n`;

    try {
      await db.query('SELECT 1');
      message += `✅ Database: Connected\n`;
    } catch (error) {
      message += `❌ Database: Error\n`;
    }

    const requiredEnvVars = ['DATABASE_URL', 'TOKEN_API_BOT', 'OWNER_WALLET_TON', 'TONCENTER_API_KEY', 'ADMIN_KEY'];

    let missingVars = [];
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length === 0) {
      message += `✅ Environment: All variables set\n`;
    } else {
      message += `❌ Environment: Missing ${missingVars.join(', ')}\n`;
    }

    message += `✅ Bot: Running\n`;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    message += `⏱️ Uptime: ${hours}h ${minutes}m\n`;

    const memUsage = process.memoryUsage();
    message += `💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    logger.error('Error in admin_health:', error);
    bot.sendMessage(chatId, '❌ Error checking system health.');
  }
});

// Admin Manual Payout Trigger
bot.onText(/\/admin_payout (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const adminKey = match[1].trim();

  if (!isAdmin(adminKey)) {
    return bot.sendMessage(chatId, '❌ Invalid admin key.');
  }

  try {
    const feePayoutService = require('../services/fee-payout-service');

    bot.sendMessage(chatId, '⚡ Starting manual fee payout...');

    await feePayoutService.processAllFees();

    bot.sendMessage(chatId, '✅ Fee payout completed! Check /admin_fees for updated status.');

  } catch (error) {
    logger.error('Error in admin_payout:', error);
    bot.sendMessage(chatId, '❌ Error triggering payout.');
  }
});

// ============================================
// OWNER HELPER FUNCTIONS (WALLET-BASED AUTH)
// ============================================

async function showOwnerStats(chatId) {
  try {
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = totalUsersResult.rows[0].count;

    const lifetimeUsersResult = await db.query('SELECT COUNT(*) as count FROM users WHERE has_lifetime_access = true');
    const lifetimeUsers = lifetimeUsersResult.rows[0].count;

    const activeUsersResult = await db.query(`SELECT COUNT(*) as count FROM users WHERE last_active > NOW() - INTERVAL '24 hours'`);
    const activeUsers = activeUsersResult.rows[0].count;

    const hashrateResult = await db.query('SELECT COALESCE(SUM(hashrate), 0) as total FROM users');
    const totalHashrate = parseFloat(hashrateResult.rows[0].total);

    const feesResult = await db.query(`SELECT coin, SUM(amount) as total FROM platform_fees WHERE paid_out = false GROUP BY coin`);

    let feesMessage = '';
    feesResult.rows.forEach(row => {
      feesMessage += `  ${row.coin}: ${parseFloat(row.total).toFixed(8)}\n`;
    });

    const revenueResult = await db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM lifetime_access_payments WHERE status = 'confirmed'`);
    const totalPayments = revenueResult.rows[0].count;
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    const marketplaceResult = await db.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM marketplace_purchases WHERE status = 'confirmed'`);
    const marketplacePurchases = marketplaceResult.rows[0].count;
    const marketplaceRevenue = parseFloat(marketplaceResult.rows[0].total);

    const message = `
📊 *Platform Statistics*

👥 *Users:*
Total Users: ${totalUsers}
Lifetime Access: ${lifetimeUsers}
Active (24h): ${activeUsers}

⛏️ *Mining:*
Total Hashrate: ${totalHashrate.toFixed(2)} H/s

💰 *Fees Collected (Pending):*
${feesMessage || '  No pending fees'}

💳 *Revenue:*
Lifetime Access: ${totalPayments} payments (${totalRevenue.toFixed(4)} TON)
Marketplace: ${marketplacePurchases} purchases (${marketplaceRevenue.toFixed(4)} TON)
*Total Revenue:* ${(totalRevenue + marketplaceRevenue).toFixed(4)} TON
    `;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in showOwnerStats:', error);
    bot.sendMessage(chatId, '❌ Error fetching statistics.');
  }
}

async function showOwnerUsers(chatId) {
  try {
    const recentUsersResult = await db.query(`SELECT telegram_id, username, hashrate, has_lifetime_access, created_at FROM users ORDER BY created_at DESC LIMIT 20`);

    let message = `👥 *Recent Users (Last 20)*\n\n`;

    recentUsersResult.rows.forEach((user, index) => {
      const status = user.has_lifetime_access ? '✅' : '🔓';
      message += `${index + 1}. ${status} @${user.username || user.telegram_id}\n`;
      message += `   Hashrate: ${user.hashrate || 0} H/s\n`;
      message += `   Joined: ${new Date(user.created_at).toLocaleDateString()}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in showOwnerUsers:', error);
    bot.sendMessage(chatId, '❌ Error fetching users.');
  }
}

async function showOwnerFees(chatId) {
  try {
    const feesResult = await db.query(`SELECT coin, SUM(amount) as total, COUNT(*) as count FROM platform_fees WHERE paid_out = false GROUP BY coin`);

    if (feesResult.rows.length === 0) {
      return bot.sendMessage(chatId, '💰 *Fees Collected*\n\nNo pending fees at the moment.', { parse_mode: 'Markdown' });
    }

    let message = `💰 *Platform Fees (Pending Payout)*\n\n`;

    feesResult.rows.forEach(row => {
      message += `*${row.coin}:* ${parseFloat(row.total).toFixed(8)} (${row.count} transactions)\n`;
    });

    message += `\n💡 Use "Trigger Payout" to send all fees to owner wallets.`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in showOwnerFees:', error);
    bot.sendMessage(chatId, '❌ Error fetching fees.');
  }
}

async function showOwnerPayments(chatId) {
  try {
    const paymentsResult = await db.query(`
      SELECT payment_id, user_id, amount, status, created_at
      FROM lifetime_access_payments
      ORDER BY created_at DESC
      LIMIT 20
    `);

    if (paymentsResult.rows.length === 0) {
      return bot.sendMessage(chatId, '💳 *Recent Payments*\n\nNo payments yet.', { parse_mode: 'Markdown' });
    }

    let message = `💳 *Recent Lifetime Access Payments*\n\n`;

    paymentsResult.rows.forEach((payment, index) => {
      const statusIcon = payment.status === 'confirmed' ? '✅' : payment.status === 'pending' ? '⏳' : '❌';
      message += `${index + 1}. ${statusIcon} ${payment.amount} TON\n`;
      message += `   User ID: ${payment.user_id}\n`;
      message += `   Date: ${new Date(payment.created_at).toLocaleDateString()}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in showOwnerPayments:', error);
    bot.sendMessage(chatId, '❌ Error fetching payments.');
  }
}

async function showOwnerHealth(chatId) {
  try {
    let message = `🏥 *System Health Check*\n\n`;

    try {
      await db.query('SELECT 1');
      message += `✅ Database: Connected\n`;
    } catch (error) {
      message += `❌ Database: Error\n`;
    }

    const requiredEnvVars = ['DATABASE_URL', 'TOKEN_API_BOT', 'OWNER_WALLET_TON', 'TONCENTER_API_KEY', 'ADMIN_KEY'];

    let missingVars = [];
    requiredEnvVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length === 0) {
      message += `✅ Environment: All variables set\n`;
    } else {
      message += `❌ Environment: Missing ${missingVars.join(', ')}\n`;
    }

    message += `✅ Bot: Running\n`;

    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    message += `⏱️ Uptime: ${hours}h ${minutes}m\n`;

    const memUsage = process.memoryUsage();
    message += `💾 Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error in showOwnerHealth:', error);
    bot.sendMessage(chatId, '❌ Error checking system health.');
  }
}

async function triggerOwnerPayout(chatId) {
  try {
    const feePayoutService = require('../services/fee-payout-service');

    bot.sendMessage(chatId, '⚡ Starting manual fee payout...');

    await feePayoutService.processAllFees();

    bot.sendMessage(chatId, '✅ Fee payout completed! Check "Fees Collected" for updated status.');
  } catch (error) {
    logger.error('Error in triggerOwnerPayout:', error);
    bot.sendMessage(chatId, '❌ Error triggering payout.');
  }
}

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id.toString();
  const data = query.data;

  try {
    // Owner admin dashboard (wallet-based authentication)
    if (data === 'admin_dashboard') {
      const ownerAccess = await isOwner(telegramId);

      if (!ownerAccess) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Admin access denied' });
      }

      // Show full admin dashboard
      const keyboard = {
        inline_keyboard: [
          [
            { text: '📊 Platform Stats', callback_data: 'owner_stats' },
            { text: '👥 Users', callback_data: 'owner_users' }
          ],
          [
            { text: '💰 Fees Collected', callback_data: 'owner_fees' },
            { text: '💳 Payments', callback_data: 'owner_payments' }
          ],
          [
            { text: '🏥 Health Check', callback_data: 'owner_health' },
            { text: '💸 Trigger Payout', callback_data: 'owner_payout' }
          ],
          [
            { text: '🔙 Back to Menu', callback_data: 'back_to_menu' }
          ]
        ]
      };

      bot.sendMessage(chatId,
        `👑 *Admin Dashboard*\n\n` +
        `Welcome to FasTap Mining admin panel.\n` +
        `Select an option below:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
      );

      return bot.answerCallbackQuery(query.id);
    }

    // Owner admin actions (wallet-based)
    if (data.startsWith('owner_')) {
      const ownerAccess = await isOwner(telegramId);

      if (!ownerAccess) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Admin access denied' });
      }

      const action = data.replace('owner_', '');

      switch (action) {
        case 'stats':
          await showOwnerStats(chatId);
          break;
        case 'users':
          await showOwnerUsers(chatId);
          break;
        case 'fees':
          await showOwnerFees(chatId);
          break;
        case 'payments':
          await showOwnerPayments(chatId);
          break;
        case 'health':
          await showOwnerHealth(chatId);
          break;
        case 'payout':
          await triggerOwnerPayout(chatId);
          break;
      }

      return bot.answerCallbackQuery(query.id);
    }

    // Admin callbacks (legacy key-based)
    if (data.startsWith('admin_')) {
      const parts = data.split('_');
      const action = parts[1];
      const adminKey = parts[2];

      if (!isAdmin(adminKey)) {
        return bot.answerCallbackQuery(query.id, { text: '❌ Invalid admin key' });
      }

      switch (action) {
        case 'stats':
          bot.sendMessage(chatId, 'Use: /admin_stats ' + adminKey);
          break;
        case 'users':
          bot.sendMessage(chatId, 'Use: /admin_users ' + adminKey);
          break;
        case 'fees':
          bot.sendMessage(chatId, 'Use: /admin_fees ' + adminKey);
          break;
        case 'payments':
          bot.sendMessage(chatId, 'Use: /admin_payments ' + adminKey);
          break;
        case 'health':
          bot.sendMessage(chatId, 'Use: /admin_health ' + adminKey);
          break;
        case 'payout':
          bot.sendMessage(chatId, 'Use: /admin_payout ' + adminKey);
          break;
      }

      return bot.answerCallbackQuery(query.id);
    }

    // Regular user callbacks
    switch (data) {
      case 'back_to_menu':
        bot.sendMessage(chatId, '🔙 Returning to main menu... Send /start to see options!');
        break;

      case 'cancel':
        bot.sendMessage(chatId, '❌ Operation cancelled.');
        break;

      case 'balance':
        // Execute balance command directly
        const userBalance = await db.User.findByTelegramId(telegramId);
        if (!userBalance) {
          return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
        }
        const balances = userBalance.balances || {};
        let balanceMessage = `💰 *Your Crypto Balances*\n\n`;
        const coins = ['LTC', 'DOGE', 'TON', 'BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];
        for (const coin of coins) {
          const balance = balances[coin] || 0;
          if (balance > 0) {
            balanceMessage += `${coin}: \`${balance.toFixed(8)}\`\n`;
          }
        }
        balanceMessage += `\n💎 *Total Hashrate:* ${userBalance.hashrate || 0} H/s`;
        bot.sendMessage(chatId, balanceMessage, { parse_mode: 'Markdown' });
        break;

      case 'stats':
        // Execute stats command directly
        const userStats = await db.User.findByTelegramId(telegramId);
        if (!userStats) {
          return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
        }
        const stats = await referralService.getUserReferralStats(telegramId);
        const activeItems = await marketplaceService.getUserActiveItems(userStats.id);
        let statsMessage = `📊 *Your Statistics*\n\n`;
        statsMessage += `⛏️ *Hashrate:* ${userStats.hashrate || 0} H/s\n`;
        statsMessage += `⏱️ *Joined:* ${userStats.created_at.toLocaleDateString()}\n`;
        statsMessage += `🔓 *Lifetime Access:* ${userStats.has_lifetime_access ? '✅ Active' : '❌ Not purchased'}\n\n`;
        if (activeItems.length > 0) {
          statsMessage += `🚀 *Active Boosts:*\n`;
          activeItems.forEach(item => {
            statsMessage += `• ${item.itemName}`;
            if (!item.isPermanent) {
              statsMessage += ` (${item.daysRemaining} days left)`;
            }
            statsMessage += `\n`;
          });
          statsMessage += `\n`;
        }
        if (stats.success && stats.stats.totalReferrals > 0) {
          statsMessage += `👥 *Referrals:* ${stats.stats.totalReferrals}\n`;
          statsMessage += `🎁 *Earned from Referrals:*\n`;
          const earned = stats.stats.earnedRewards;
          if (earned.LTC > 0) statsMessage += `  LTC: ${earned.LTC}\n`;
          if (earned.DOGE > 0) statsMessage += `  DOGE: ${earned.DOGE}\n`;
          if (earned.TON > 0) statsMessage += `  TON: ${earned.TON}\n`;
        }
        bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
        break;

      case 'marketplace':
        // Show marketplace categories directly in bot
        bot.sendMessage(chatId,
          `🛒 *Marketplace - Boost Your Mining!*\n\n` +
          `Choose a category to browse items:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚡ AutoTap Tiers (Permanent)', callback_data: 'shop_autotap' }],
                [{ text: '🚀 Hashrate Multipliers (30 days)', callback_data: 'shop_multiplier' }],
                [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          }
        );
        break;

      case 'shop_autotap':
        // Show AutoTap items
        const autotapItems = marketplaceService.getMarketplaceItems().filter(i => i.id.startsWith('autotap'));
        let autotapMsg = `⚡ *AutoTap Tiers (Permanent)*\n\n`;
        autotapMsg += `Automate your mining forever!\n\n`;

        const autotapButtons = autotapItems.map(item => [{
          text: `${item.name} - ${item.price} TON`,
          callback_data: `buy_${item.id}`
        }]);
        autotapButtons.push([{ text: '🔙 Back to Marketplace', callback_data: 'marketplace' }]);

        bot.sendMessage(chatId, autotapMsg, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: autotapButtons }
        });
        break;

      case 'shop_multiplier':
        // Show Multiplier items
        const multiplierItems = marketplaceService.getMarketplaceItems().filter(i => i.id.startsWith('multiplier'));
        let multiplierMsg = `🚀 *Hashrate Multipliers (30 days)*\n\n`;
        multiplierMsg += `Boost your mining power!\n\n`;

        const multiplierButtons = multiplierItems.map(item => [{
          text: `${item.name} - ${item.price} TON`,
          callback_data: `buy_${item.id}`
        }]);
        multiplierButtons.push([{ text: '🔙 Back to Marketplace', callback_data: 'marketplace' }]);

        bot.sendMessage(chatId, multiplierMsg, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: multiplierButtons }
        });
        break;

      case 'referral':
        // Execute referral command directly
        const result = await referralService.getUserReferralCode(telegramId);
        if (!result.success) {
          return bot.sendMessage(chatId, '❌ Error getting referral code.');
        }
        let referralMessage = `👥 *Referral Program - NEW SYSTEM!*\n\n`;
        referralMessage += `*Your Referral Code:* \`${result.referralCode}\`\n`;
        referralMessage += `*Your Referral Link:*\n${result.referralUrl}\n\n`;
        referralMessage += `*💰 How it works:*\n`;
        referralMessage += `✅ *You get:* 10% of ALL your friend's mining rewards!\n`;
        referralMessage += `✅ *Your friend:* Mines normally (85% after fees)\n`;
        referralMessage += `✅ *Platform:* 5% fee supports development\n\n`;
        referralMessage += `*Example:* Friend mines 100 TON\n`;
        referralMessage += `  → Friend receives: 85 TON\n`;
        referralMessage += `  → You receive: 10 TON (10% bonus!)\n`;
        referralMessage += `  → Platform: 5 TON (5% fee)\n\n`;
        referralMessage += `🎁 *Passive income forever!*\nEarn from every block your friends find!`;
        const referralStats = await referralService.getUserReferralStats(telegramId);
        if (referralStats.success && referralStats.stats.totalReferrals > 0) {
          referralMessage += `\n\n📊 *Your Stats:*\n`;
          referralMessage += `Total Referrals: ${referralStats.stats.totalReferrals}\n`;
          referralMessage += `Total Earned:\n`;
          const earned = referralStats.stats.earnedRewards;
          if (earned.LTC > 0) referralMessage += `  LTC: ${earned.LTC}\n`;
          if (earned.DOGE > 0) referralMessage += `  DOGE: ${earned.DOGE}\n`;
          if (earned.TON > 0) referralMessage += `  TON: ${earned.TON}\n`;
        }
        bot.sendMessage(chatId, referralMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📤 Share Referral Link', switch_inline_query: `Join FasTap Mining and earn crypto! ${result.referralUrl}` }]
            ]
          }
        });
        break;

      case 'wallet':
        // Execute wallet command directly
        const userWallet = await db.User.findByTelegramId(telegramId);
        if (!userWallet) {
          return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
        }
        let walletMessage = `💼 *Your Wallets*\n\n`;
        if (userWallet.wallet_ton) {
          walletMessage += `*TON Wallet:*\n\`${userWallet.wallet_ton}\`\n\n`;
        } else {
          walletMessage += `❌ *TON Wallet:* Not connected\n\n`;
        }
        walletMessage += `*Scrypt Coin Wallets:*\n`;
        const scryptCoins = ['BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];
        scryptCoins.forEach(coin => {
          const walletKey = `wallet_${coin.toLowerCase()}`;
          if (userWallet[walletKey]) {
            walletMessage += `${coin}: \`${userWallet[walletKey]}\`\n`;
          } else {
            walletMessage += `${coin}: Not set\n`;
          }
        });
        walletMessage += `\n💡 Connect wallets in the mining app to receive rewards.`;
        bot.sendMessage(chatId, walletMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔗 Connect Wallets', web_app: { url: WEBAPP_URL } }]
            ]
          }
        });
        break;

      case 'notifications':
        bot.sendMessage(chatId,
          `🔔 *Notifications Settings*\n\n` +
          `Notification preferences can be managed in the mining app.\n\n` +
          `*Available notifications:*\n` +
          `• Mining rewards\n` +
          `• Referral earnings\n` +
          `• Marketplace purchases\n` +
          `• System updates`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '⚙️ Open Settings', web_app: { url: WEBAPP_URL } }]
              ]
            }
          }
        );
        break;

      case 'help':
        const helpMessage = `
📖 *FasTap Mining - Help*

*Commands:*
/start - Start mining and view dashboard
/balance - Check your crypto balances
/stats - View your mining statistics
/marketplace - Browse boost items
/referral - Get your referral code
/help - Show this help message

*How to Mine:*
1. Tap the "Start Mining" button
2. Tap on the screen to mine
3. Earn real cryptocurrencies!

*Features:*
⛏️ Mine 8 real coins simultaneously
💰 Automatic TON conversion
🚀 AutoTap for passive mining
📈 Multipliers to boost earnings
👥 Referral rewards

*Support:*
Email: support@fas-tap-mining.com
Telegram: @FasTapMiningSupport

*Powered by ViaBTC mining pool* 💎
        `;
        bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        break;

      case 'lifetime':
        const user = await db.User.findByTelegramId(telegramId);
        if (!user) {
          return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
        }

        // Check if user is OWNER (should have free access)
        const ownerAccess = await isOwner(telegramId);
        const isOwnerByTelegramId = OWNER_TELEGRAM_IDS.includes(telegramId.toString());
        const hasOwnerPrivileges = ownerAccess || isOwnerByTelegramId;

        if (hasOwnerPrivileges) {
          // Grant lifetime access to owner for free
          if (!user.has_lifetime_access) {
            await db.query(
              'UPDATE users SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW() WHERE id = $1',
              [user.id]
            );
          }
          return bot.sendMessage(chatId,
            `👑 *Owner Access*\n\n` +
            `✅ You have lifetime access for FREE!\n` +
            `💎 All features unlocked\n\n` +
            `Start mining now! ⛏️`,
            { parse_mode: 'Markdown' }
          );
        }

        // Send Telegram Invoice for TON payment (uses TON Connect automatically!)
        const tonPrice = parseFloat(process.env.LIFETIME_ACCESS_PRICE || 1.0);
        const priceInNanoTON = Math.floor(tonPrice * 1000000000); // Convert TON to nanoTON

        try {
          await bot.sendInvoice(
            chatId,
            '🔓 Lifetime Mining Access', // title
            'Get unlimited mining access forever! ⛏️\n\n' +
            '✅ Unlimited mining\n' +
            '✅ All features unlocked\n' +
            '✅ AutoTap & multipliers available\n' +
            '✅ Priority support', // description
            `lifetime_${user.id}_${Date.now()}`, // payload
            '', // provider_token (empty for Telegram Stars)
            'TON', // currency
            [{ label: 'Lifetime Access', amount: priceInNanoTON }], // prices
            {
              need_name: false,
              need_phone_number: false,
              need_email: false,
              need_shipping_address: false,
              is_flexible: false,
              photo_url: 'https://fas-tap-mining.vercel.app/icon-512.png',
              photo_width: 512,
              photo_height: 512
            }
          );
        } catch (error) {
          logger.error('❌ Send invoice error:', error);
          return bot.sendMessage(chatId,
            `❌ Payment system error. Please try again or contact support.\n\n` +
            `Error: ${error.message}`
          );
        }
        break;

      default:
        // Handle marketplace item purchase
        if (data.startsWith('buy_')) {
          const itemId = data.replace('buy_', '');
          const items = marketplaceService.getMarketplaceItems();
          const item = items.find(i => i.id === itemId);

          if (!item) {
            return bot.sendMessage(chatId, '❌ Item not found.');
          }

          // Check if user has TON wallet connected
          const buyUser = await db.User.findByTelegramId(telegramId);
          if (!buyUser) {
            return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
          }

          // Show item purchase confirmation
          bot.sendMessage(chatId,
            `🛒 *${item.name}*\n\n` +
            `${item.description}\n\n` +
            `💰 *Price:* ${item.price} TON\n` +
            `⏱️ *Duration:* ${item.duration === 'permanent' ? 'Permanent' : '30 days'}\n\n` +
            `Connect your TON wallet in the app to complete purchase! 👇`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '💳 Open App & Purchase', web_app: { url: WEBAPP_URL } }],
                  [{ text: '🔙 Back to Marketplace', callback_data: 'marketplace' }]
                ]
              }
            }
          );
          break;
        }

        // Unknown callback
        logger.warn(`Unknown callback data: ${data}`);
        bot.sendMessage(chatId, '❓ Unknown action. Please try again.');
        break;
    }

    bot.answerCallbackQuery(query.id);

  } catch (error) {
    logger.error('Error handling callback:', error);
    bot.answerCallbackQuery(query.id, { text: '❌ Error processing request' });
  }
});

// Pre-checkout query handler (REQUIRED for Telegram payments)
bot.on('pre_checkout_query', async (query) => {
  try {
    // Always approve - validation done when creating invoice
    await bot.answerPreCheckoutQuery(query.id, true);
    logger.info(`✅ Pre-checkout approved for user ${query.from.id}`);
  } catch (error) {
    logger.error('❌ Pre-checkout error:', error);
    await bot.answerPreCheckoutQuery(query.id, false, 'Payment processing error. Please try again.');
  }
});

// Successful payment handler
bot.on('successful_payment', async (msg) => {
  try {
    const payment = msg.successful_payment;
    const userId = msg.from.id;
    const payload = payment.invoice_payload; // Format: lifetime_USER_ID_TIMESTAMP

    logger.info(`💰 Payment received from user ${userId}:`, {
      payload,
      amount: payment.total_amount,
      currency: payment.currency,
      telegram_payment_charge_id: payment.telegram_payment_charge_id
    });

    // Extract user ID from payload
    const payloadParts = payload.split('_');
    if (payloadParts[0] === 'lifetime' && payloadParts[1]) {
      const dbUserId = parseInt(payloadParts[1]);

      // Grant lifetime access
      await db.query(
        `UPDATE users
         SET has_lifetime_access = TRUE,
             lifetime_access_granted_at = NOW(),
             lifetime_access_tx_hash = $1
         WHERE id = $2`,
        [payment.telegram_payment_charge_id, dbUserId]
      );

      logger.info(`✅ Lifetime access granted to user ${userId} (DB ID: ${dbUserId})`);

      // Send confirmation
      await bot.sendMessage(msg.chat.id,
        `🎉 *Payment Successful!*\n\n` +
        `✅ Lifetime Access Activated!\n\n` +
        `💎 You now have:\n` +
        `• Unlimited mining forever\n` +
        `• Access to all features\n` +
        `• AutoTap & multipliers available\n` +
        `• Priority support\n\n` +
        `Start mining and enjoy! ⛏️`,
        { parse_mode: 'Markdown' }
      );

      // Create notification
      await db.Notification.create(
        dbUserId,
        'payment',
        '🎉 Lifetime Access Activated',
        'Your payment was successful! You now have unlimited mining access.',
        { amount: payment.total_amount, currency: payment.currency }
      );
    } else {
      logger.error('❌ Invalid payment payload:', payload);
      await bot.sendMessage(msg.chat.id,
        `⚠️ Payment received but there was an issue activating your access.\n\n` +
        `Don't worry - we received your payment.\n` +
        `Contact support: @FasTapMiningSupport\n` +
        `Payment ID: ${payment.telegram_payment_charge_id}`
      );
    }
  } catch (error) {
    logger.error('❌ Successful payment handler error:', error);
    await bot.sendMessage(msg.chat.id,
      `⚠️ Payment received but there was an error.\n\n` +
      `Don't worry - we received your payment.\n` +
      `Contact support: @FasTapMiningSupport`
    );
  }
});

// Error handler
bot.on('polling_error', (error) => {
  logger.error('Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n🛑 Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n🛑 Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});

module.exports = bot;
