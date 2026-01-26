const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const TelegramBot = require('node-telegram-bot-api');
const db = require('../database/db');
const lifetimeAccessService = require('../services/lifetime-access-service');
const marketplaceService = require('../services/marketplace-service');
const referralService = require('../services/referral-service');

// Verify bot token
if (!process.env.TOKEN_API_BOT) {
  console.error('❌ ERROR: TOKEN_API_BOT not found in environment variables!');
  console.error('📁 Make sure .env file exists in project root with TOKEN_API_BOT=your_token');
  process.exit(1);
}

// Initialize bot
const bot = new TelegramBot(process.env.TOKEN_API_BOT, { polling: true });
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://fas-tap-mining.vercel.app';

console.log('🤖 FasTap Mining Bot Started!');
console.log(`📱 Web App URL: ${WEBAPP_URL}`);
console.log(`✅ Bot Token: ${process.env.TOKEN_API_BOT.slice(0, 10)}...`);

// Start command - Handle referrals
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id.toString();
  const username = msg.from.username || msg.from.first_name;
  const referralCode = match[1] ? match[1].trim() : null;

  try {
    // Get or create user
    let user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      user = await db.User.create({
        telegram_id: telegramId,
        username: username
      });
      console.log(`✨ New user created: ${telegramId}`);

      // Process referral if code provided
      if (referralCode) {
        const referralResult = await referralService.processReferral(telegramId, referralCode);

        if (referralResult.success) {
          bot.sendMessage(chatId,
            `🎁 *Welcome Bonus!*\n\n` +
            `You joined via referral code: \`${referralCode}\`\n\n` +
            `*You received:*\n` +
            `✅ 0.0005 LTC\n` +
            `✅ 0.5 DOGE\n` +
            `✅ 0.05 TON\n\n` +
            `Your referrer also got rewards! 🎉`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    }

    // Check lifetime access
    const hasAccess = user.has_lifetime_access;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⛏️ Start Mining', web_app: { url: WEBAPP_URL } }
        ],
        [
          { text: '💰 My Balance', callback_data: 'balance' },
          { text: '📊 Statistics', callback_data: 'stats' }
        ],
        [
          { text: '🛒 Marketplace', callback_data: 'marketplace' },
          { text: '👥 Referrals', callback_data: 'referral' }
        ],
        ...(!hasAccess ? [[{ text: '🔥 Get Lifetime Access (1 TON)', callback_data: 'lifetime' }]] : [])
      ]
    };

    const welcomeMessage = hasAccess
      ? `🎉 *Welcome back, ${username}!*\n\n` +
        `⛏️ *Status:* Lifetime Access Active\n` +
        `💎 *Mining:* ${user.hashrate || 0} H/s\n\n` +
        `Tap the button below to start mining!`
      : `👋 *Welcome to FasTap Mining!*\n\n` +
        `⛏️ Mine *8 real cryptocurrencies* by tapping!\n` +
        `💰 LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC\n\n` +
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
    console.error('Error in /start:', error);
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
    console.error('Error in /balance:', error);
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
    console.error('Error in /stats:', error);
    bot.sendMessage(chatId, '❌ Error fetching statistics.');
  }
});

// Marketplace command
bot.onText(/\/marketplace/, async (msg) => {
  const chatId = msg.chat.id;

  const items = marketplaceService.getMarketplaceItems();

  let message = `🛒 *Marketplace - Boost Your Mining!*\n\n`;

  message += `*⚡ AutoTap Tiers (Permanent):*\n`;
  items.filter(i => i.id.startsWith('autotap')).forEach(item => {
    message += `• ${item.name} - ${item.price} TON\n`;
    message += `  ${item.description}\n\n`;
  });

  message += `*🚀 Multipliers (30 days):*\n`;
  items.filter(i => i.id.startsWith('multiplier')).forEach(item => {
    message += `• ${item.name} - ${item.price} TON\n`;
    message += `  ${item.description}\n\n`;
  });

  message += `Tap button below to purchase! 👇`;

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Open Marketplace', web_app: { url: `${WEBAPP_URL}/marketplace` } }]
      ]
    }
  });
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

    let message = `👥 *Referral Program*\n\n`;
    message += `*Your Referral Code:* \`${result.referralCode}\`\n`;
    message += `*Your Referral Link:*\n${result.referralUrl}\n\n`;
    message += `*Rewards:*\n`;
    message += `✅ You get: 0.001 LTC + 1 DOGE + 0.1 TON\n`;
    message += `✅ Your friend gets: 0.0005 LTC + 0.5 DOGE + 0.05 TON\n\n`;
    message += `Share your link and earn together! 🎁`;

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
    console.error('Error in /referral:', error);
    bot.sendMessage(chatId, '❌ Error fetching referral info.');
  }
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
    console.error('Error in /claim:', error);
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
    console.error('Error in /wallet:', error);
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
      `SELECT mp.*, mi.name, mi.effect
       FROM marketplace_purchases mp
       JOIN marketplace_items mi ON mp.item_id = mi.id
       WHERE mp.user_id = $1
       AND mi.category = 'autotap'
       AND mp.status = 'confirmed'
       AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
       ORDER BY mp.purchased_at DESC
       LIMIT 1`,
      [user.id]
    );

    if (autotapResult.rows.length > 0) {
      const autotap = autotapResult.rows[0];
      const isPermanent = !autotap.expires_at;

      let message = `⚡ *AutoTap Active!*\n\n`;
      message += `*Tier:* ${autotap.name}\n`;
      message += `*Effect:* ${autotap.effect}\n`;
      message += `*Status:* ${isPermanent ? '👑 Permanent' : `📅 Expires ${new Date(autotap.expires_at).toLocaleDateString()}`}\n\n`;
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
    console.error('Error in /autotap:', error);
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
      `SELECT mp.*, mi.name, mi.effect, mi.category
       FROM marketplace_purchases mp
       JOIN marketplace_items mi ON mp.item_id = mi.id
       WHERE mp.user_id = $1
       AND mp.status = 'confirmed'
       AND (mp.expires_at IS NULL OR mp.expires_at > NOW())
       ORDER BY mp.purchased_at DESC`,
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

    activeBoosts.rows.forEach((boost, index) => {
      const isPermanent = !boost.expires_at;
      message += `${index + 1}. *${boost.name}*\n`;
      message += `   ${boost.effect}\n`;
      message += `   Status: ${isPermanent ? '👑 Permanent' : `📅 ${Math.ceil((new Date(boost.expires_at) - new Date()) / (1000 * 60 * 60 * 24))} days left`}\n\n`;
    });

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Error in /boosts:', error);
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
    console.error('Error in /leaderboard:', error);
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
    console.error('Error in /settings:', error);
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
  console.log('✅ Bot commands menu set successfully');
}).catch(err => {
  console.error('❌ Error setting bot commands:', err);
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
    console.error('Error in admin_stats:', error);
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
    console.error('Error in admin_users:', error);
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
    console.error('Error in admin_fees:', error);
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
    console.error('Error in admin_payments:', error);
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
    console.error('Error in admin_health:', error);
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
    console.error('Error in admin_payout:', error);
    bot.sendMessage(chatId, '❌ Error triggering payout.');
  }
});

// Callback query handler
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const telegramId = query.from.id.toString();
  const data = query.data;

  try {
    // Admin callbacks
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
      case 'balance':
        bot.sendMessage(chatId, 'Use /balance command to see your balances!');
        break;

      case 'stats':
        bot.sendMessage(chatId, 'Use /stats command to see your statistics!');
        break;

      case 'marketplace':
        bot.sendMessage(chatId, 'Use /marketplace command to browse items!');
        break;

      case 'referral':
        bot.sendMessage(chatId, 'Use /referral command to get your referral link!');
        break;

      case 'lifetime':
        const user = await db.User.findByTelegramId(telegramId);
        if (!user) {
          return bot.sendMessage(chatId, '❌ User not found. Send /start first.');
        }

        const payment = await lifetimeAccessService.createPaymentRequest(user.id, telegramId);

        if (!payment.success) {
          return bot.sendMessage(chatId, `❌ ${payment.error}`);
        }

        const paymentMsg =
          `🔓 *Lifetime Access - 1 TON*\n\n` +
          `Send exactly *${payment.amount} TON* to:\n` +
          `\`${payment.paymentAddress}\`\n\n` +
          `*Payment expires in 60 minutes*\n\n` +
          `After payment, you'll get:\n` +
          `✅ Unlimited mining forever\n` +
          `✅ Access to all features\n` +
          `✅ AutoTap & multipliers available\n\n` +
          `Payment will be confirmed automatically! ⚡`;

        bot.sendMessage(chatId, paymentMsg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ I Sent the Payment', callback_data: `check_payment_${payment.paymentId}` }],
              [{ text: '❌ Cancel', callback_data: 'cancel' }]
            ]
          }
        });
        break;

      default:
        if (data.startsWith('check_payment_')) {
          const paymentId = data.replace('check_payment_', '');
          const status = await lifetimeAccessService.checkPayment(paymentId);

          if (status.status === 'confirmed') {
            bot.sendMessage(chatId,
              `🎉 *Payment Confirmed!*\n\n` +
              `✅ Lifetime Access Activated!\n\n` +
              `You now have unlimited mining access.\n` +
              `Start mining and enjoy all features! 💎`,
              { parse_mode: 'Markdown' }
            );
          } else if (status.status === 'pending') {
            bot.sendMessage(chatId,
              `⏳ Payment is still pending...\n\n` +
              `Time remaining: ${Math.floor(status.timeRemaining / 60)} minutes\n\n` +
              `We'll notify you when confirmed! ⚡`,
              { parse_mode: 'Markdown' }
            );
          } else if (status.status === 'expired') {
            bot.sendMessage(chatId, '❌ Payment expired. Please create a new payment.');
          }
        }
        break;
    }

    bot.answerCallbackQuery(query.id);

  } catch (error) {
    console.error('Error handling callback:', error);
    bot.answerCallbackQuery(query.id, { text: '❌ Error processing request' });
  }
});

// Error handler
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Bot shutting down...');
  bot.stopPolling();
  process.exit(0);
});

module.exports = bot;
