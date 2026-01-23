const { Telegraf } = require('telegraf');
const db = require('../database/db');

// Initialize bot for payment invoices
const bot = new Telegraf(process.env.TOKEN_API_BOT);

// OWNER WALLET - ALL PAYMENTS GO HERE (gets everything FREE)
const OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';

// BOOST ITEMS - PRICES IN TELEGRAM STARS
const SHOP_ITEMS = {
  // AUTOTAP TIERS
  autotap_basic: {
    id: 'autotap_basic',
    name: 'AutoTap Basic',
    description: 'Passive mining 24/7 even when offline. +1 share/sec for 30 days',
    price: 50, // 50 Stars
    effect: '+1 share/sec for 30 days',
    category: 'autotap',
    icon: '🤖',
    duration: 2592000000 // 30 days
  },
  autotap_pro: {
    id: 'autotap_pro',
    name: 'AutoTap Pro',
    description: '5x faster passive mining. +5 shares/sec for 30 days',
    price: 150, // 150 Stars
    effect: '+5 shares/sec for 30 days',
    category: 'autotap',
    icon: '⚡',
    duration: 2592000000,
    popular: true
  },
  autotap_ultimate: {
    id: 'autotap_ultimate',
    name: 'AutoTap Ultimate',
    description: 'Maximum passive mining power. +20 shares/sec for 90 days',
    price: 500, // 500 Stars
    effect: '+20 shares/sec for 90 days',
    category: 'autotap',
    icon: '🔥',
    duration: 7776000000 // 90 days
  },
  autotap_lifetime: {
    id: 'autotap_lifetime',
    name: 'AutoTap Lifetime',
    description: 'FOREVER passive mining - best value! +50 shares/sec FOREVER',
    price: 1500, // 1500 Stars
    effect: '+50 shares/sec FOREVER',
    category: 'autotap',
    icon: '👑',
    duration: null,
    bestValue: true
  },

  // MANUAL TAP BOOSTS
  multitap_30d: {
    id: 'multitap_30d',
    name: 'MultiTap Boost',
    description: 'Double your shares per tap. x2 shares per tap for 30 days',
    price: 50, // 50 Stars
    effect: 'x2 shares per tap for 30 days',
    category: 'boost',
    icon: '⚡',
    duration: 2592000000
  },
  luckytap_30d: {
    id: 'luckytap_30d',
    name: 'LuckyTap Boost',
    description: '10% chance for x10 reward on block found',
    price: 100, // 100 Stars
    effect: '10% chance x10 reward for 30 days',
    category: 'boost',
    icon: '🍀',
    duration: 2592000000
  },
  megaboost_7d: {
    id: 'megaboost_7d',
    name: 'MegaBoost',
    description: 'x5 mining speed + x3 rewards for 7 days',
    price: 200, // 200 Stars
    effect: 'x5 speed + x3 rewards for 7 days',
    category: 'boost',
    icon: '💥',
    duration: 604800000 // 7 days
  },

  // PREMIUM PASS
  premium_month: {
    id: 'premium_month',
    name: 'Premium Pass',
    description: 'All boosts active + exclusive NFTs + priority support for 30 days',
    price: 300, // 300 Stars
    effect: 'All boosts + priority support for 30 days',
    category: 'premium',
    icon: '👑',
    duration: 2592000000
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      const user = await db.User.findByTelegramId(userId);

      // Check if user is GOD (owner wallet)
      const isGod = user && user.wallet_address === OWNER_WALLET;

      // Get user's active boosts
      const activeBoosts = await getUserActiveBoosts(user?.id);

      return res.json({
        success: true,
        items: Object.values(SHOP_ITEMS).map(item => ({
          ...item,
          price: isGod ? 0 : item.price, // FREE for GOD
          currency: 'Stars',
          alreadyOwned: activeBoosts.some(b => b.item_id === item.id && b.is_active)
        })),
        currency: 'Stars',
        isGod: isGod,
        activeBoosts: activeBoosts
      });
    } catch (error) {
      console.error('Shop GET error:', error);
      return res.status(500).json({ error: 'Failed to load shop' });
    }
  }

  if (req.method === 'POST') {
    const { userId, itemId, action } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      const user = await db.User.findByTelegramId(userId);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.wallet_address) {
        return res.status(400).json({ error: 'Wallet not connected' });
      }

      const item = SHOP_ITEMS[itemId];
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Check if user is GOD
      const isGod = user.wallet_address === OWNER_WALLET;

      // If GOD, activate immediately without payment
      if (isGod) {
        return await activateBoost(user, item, null, true, res);
      }

      // For regular users, send Telegram Stars invoice
      if (action === 'initiate_purchase') {
        try {
          // Create invoice for Telegram Stars
          const invoice = await bot.telegram.sendInvoice(
            userId,
            item.name,
            item.description,
            `purchase_${itemId}_${Date.now()}`, // payload
            '', // provider_token (empty for Stars)
            'XTR', // currency (Telegram Stars)
            [{ label: item.name, amount: item.price }], // prices array
            {
              photo_url: `https://fastapmining.vercel.app/icons/${item.icon}.png`,
              photo_width: 512,
              photo_height: 512,
              need_name: false,
              need_phone_number: false,
              need_email: false,
              need_shipping_address: false,
              send_phone_number_to_provider: false,
              send_email_to_provider: false,
              is_flexible: false
            }
          );

          return res.json({
            success: true,
            message: 'Invoice sent to Telegram',
            invoice_message_id: invoice.message_id
          });
        } catch (error) {
          console.error('Send invoice error:', error);
          return res.status(500).json({
            error: 'Failed to create invoice',
            message: error.message
          });
        }
      }

      return res.status(400).json({
        error: 'Invalid action',
        message: 'Use action=initiate_purchase to buy items'
      });

    } catch (error) {
      console.error('Shop POST error:', error);
      return res.status(500).json({
        error: 'Purchase failed',
        message: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// Handle successful payment (called from bot webhook)
async function handleSuccessfulPayment(userId, payload, telegramPaymentChargeId) {
  try {
    // Extract itemId from payload: "purchase_autotap_pro_1234567890"
    const match = payload.match(/^purchase_(.+)_\d+$/);
    if (!match) {
      console.error('Invalid payload format:', payload);
      return false;
    }

    const itemId = match[1];
    const item = SHOP_ITEMS[itemId];

    if (!item) {
      console.error('Item not found:', itemId);
      return false;
    }

    const user = await db.User.findByTelegramId(userId);
    if (!user) {
      console.error('User not found:', userId);
      return false;
    }

    // Activate boost
    await activateBoost(user, item, telegramPaymentChargeId, false, null);

    // Send confirmation message
    await bot.telegram.sendMessage(
      userId,
      `🎉 Purchase Complete!\n\n` +
      `${item.icon} ${item.name} activated!\n` +
      `${item.effect}\n\n` +
      `Open the app to see your new boost in action! ⚡`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ Open Mining App', web_app: { url: process.env.WEBAPP_URL || 'https://fastapmining.vercel.app' } }]
          ]
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Handle successful payment error:', error);
    return false;
  }
}

// Activate boost in database
async function activateBoost(user, item, paymentId, isGod, res) {
  return await db.transaction(async (client) => {
    // Create purchase record
    const { rows: [purchase] } = await client.query(
      `INSERT INTO purchases (user_id, item_id, item_type, price, currency, payment_method, payment_tx_hash, status, activated_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
       RETURNING *`,
      [
        user.id,
        item.id,
        item.category,
        isGod ? 0 : item.price,
        'XTR',
        isGod ? 'GOD_MODE' : 'TELEGRAM_STARS',
        paymentId || 'GOD_MODE_FREE',
        'completed',
        { item_name: item.name, effect: item.effect, is_god: isGod }
      ]
    );

    // Activate based on category
    if (item.category === 'autotap') {
      const expiresAt = item.duration ? new Date(Date.now() + item.duration) : null;
      const sharesPerSecond = parseInt(item.effect.match(/\+(\d+)/)[1]);

      await client.query(
        `INSERT INTO autotap_subscriptions (user_id, tier, shares_per_second, activated_at, expires_at, is_lifetime, payment_tx_hash)
         VALUES ($1, $2, $3, NOW(), $4, $5, $6)`,
        [user.id, item.id, sharesPerSecond, expiresAt, !item.duration, paymentId || 'GOD_MODE_FREE']
      );
    } else if (item.category === 'boost' || item.category === 'premium') {
      const expiresAt = new Date(Date.now() + item.duration);

      await client.query(
        `INSERT INTO user_boosts (user_id, boost_id, boost_name, effect, activated_at, expires_at, is_active)
         VALUES ($1, $2, $3, $4, NOW(), $5, TRUE)
         ON CONFLICT (user_id, boost_id)
         DO UPDATE SET activated_at = NOW(), expires_at = $5, is_active = TRUE`,
        [user.id, item.id, item.name, item.effect, expiresAt]
      );
    }

    // Create notification
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        user.id,
        'purchase_success',
        '🎉 Purchase Complete!',
        isGod
          ? `${item.name} activated for FREE (GOD MODE)!`
          : `${item.name} activated! ${item.effect}`,
        { item_id: item.id, purchase_id: purchase.id, is_god: isGod }
      ]
    );

    await db.invalidateCache(`user:${user.id}:*`);

    if (res) {
      return res.json({
        success: true,
        purchased: true,
        item: item,
        purchase_id: purchase.id,
        message: isGod
          ? `🎉 ${item.name} activated FREE (GOD MODE)!`
          : `🎉 ${item.name} activated! ${item.effect}`,
        payment: {
          amount: isGod ? 0 : item.price,
          currency: 'XTR',
          payment_id: paymentId,
          is_god: isGod
        }
      });
    }
  });
}

async function getUserActiveBoosts(userId) {
  if (!userId) return [];

  try {
    const { rows } = await db.query(
      `SELECT * FROM user_boosts
       WHERE user_id = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [userId]
    );
    return rows;
  } catch (error) {
    console.error('Get active boosts error:', error);
    return [];
  }
}

// Ensure boosts table exists
async function ensureBoostsTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_boosts (
        id SERIAL PRIMARY KEY,
        user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
        boost_id VARCHAR(50) NOT NULL,
        boost_name VARCHAR(100) NOT NULL,
        effect TEXT,
        activated_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(user_id, boost_id)
      );
      CREATE INDEX IF NOT EXISTS idx_user_boosts_user ON user_boosts(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_boosts_active ON user_boosts(is_active) WHERE is_active = TRUE;
    `);
  } catch (error) {
    console.error('Ensure boosts table error:', error);
  }
}

ensureBoostsTable();

// Export for bot webhook handler
module.exports.handleSuccessfulPayment = handleSuccessfulPayment;
