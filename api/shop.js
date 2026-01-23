// Telegram Stars Shop - Compliant with Telegram payment policies
// All digital goods MUST be purchased with Telegram Stars

const { Telegraf } = require('telegraf');

// Shop Items (prices in Telegram Stars)
const SHOP_ITEMS = {
  // AUTOTAP PASSIVE MINING TIERS
  autotap_basic: {
    id: 'autotap_basic',
    name: 'AutoTap Basic',
    description: 'Mine automatically 24/7 even when offline',
    price: 500, // 500 Telegram Stars (~$5)
    effect: '+1 share/sec for 30 days',
    category: 'autotap',
    icon: '🤖'
  },
  autotap_pro: {
    id: 'autotap_pro',
    name: 'AutoTap Pro',
    description: '5x faster passive mining',
    price: 1500, // 1500 Telegram Stars (~$15)
    effect: '+5 shares/sec for 30 days',
    category: 'autotap',
    icon: '⚡',
    popular: true
  },
  autotap_ultimate: {
    id: 'autotap_ultimate',
    name: 'AutoTap Ultimate',
    description: 'Maximum passive mining speed',
    price: 5000, // 5000 Telegram Stars (~$50)
    effect: '+20 shares/sec for 90 days',
    category: 'autotap',
    icon: '🔥'
  },
  autotap_lifetime: {
    id: 'autotap_lifetime',
    name: 'AutoTap Lifetime',
    description: 'FOREVER passive mining - best value!',
    price: 15000, // 15000 Telegram Stars (~$150)
    effect: '+50 shares/sec FOREVER',
    category: 'autotap',
    icon: '👑',
    bestValue: true
  },

  // MANUAL TAP BOOSTS
  multitap: {
    id: 'multitap',
    name: 'MultiTap Boost',
    description: 'Double your shares per manual tap',
    price: 500, // 500 Telegram Stars
    effect: 'x2 shares per tap (30 days)',
    category: 'boost',
    icon: '⚡'
  },
  luckytap: {
    id: 'luckytap',
    name: 'LuckyTap Boost',
    description: '10% chance for x10 reward multiplier',
    price: 1000, // 1000 Telegram Stars
    effect: '10% chance x10 reward (30 days)',
    category: 'boost',
    icon: '🍀'
  },

  // PREMIUM
  premium_month: {
    id: 'premium_month',
    name: 'Premium Pass',
    description: 'All boosts + exclusive NFTs + priority support',
    price: 2500, // 2500 Telegram Stars
    effect: 'All features for 30 days',
    category: 'premium',
    icon: '👑'
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Get shop items
    const { userId } = req.query;

    return res.json({
      success: true,
      items: Object.values(SHOP_ITEMS),
      currency: 'Telegram Stars',
      note: 'Purchases are processed through Telegram\'s secure payment system'
    });
  }

  if (req.method === 'POST') {
    const { userId, itemId, paymentId } = req.body;

    if (!userId || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = SHOP_ITEMS[itemId];
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // In production, verify payment with Telegram API
    // For now, simulate successful purchase

    // Create invoice link for Telegram Stars payment
    const bot = new Telegraf(process.env.TOKEN_API_BOT);

    try {
      // Generate invoice
      const invoice = {
        title: item.name,
        description: item.description,
        payload: JSON.stringify({ userId, itemId, timestamp: Date.now() }),
        provider_token: '', // Empty for Telegram Stars
        currency: 'XTR', // Telegram Stars currency code
        prices: [{ label: item.name, amount: item.price }]
      };

      // Send invoice to user
      await bot.telegram.sendInvoice(userId, invoice);

      return res.json({
        success: true,
        message: 'Payment invoice sent to your Telegram',
        item: item,
        paymentMethod: 'Telegram Stars'
      });
    } catch (error) {
      console.error('Payment error:', error);
      return res.status(500).json({
        error: 'Payment failed',
        message: 'Could not create payment invoice. Please try again.'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

// Handle successful payments (webhook from Telegram)
module.exports.handlePayment = async (update) => {
  if (update.pre_checkout_query) {
    // Pre-checkout validation
    const bot = new Telegraf(process.env.TOKEN_API_BOT);

    await bot.telegram.answerPreCheckoutQuery(
      update.pre_checkout_query.id,
      true // Always approve for Telegram Stars
    );
  }

  if (update.message && update.message.successful_payment) {
    // Payment successful!
    const payment = update.message.successful_payment;
    const payload = JSON.parse(payment.invoice_payload);

    const { userId, itemId } = payload;
    const item = SHOP_ITEMS[itemId];

    // Activate boost for user (in production, save to database)
    console.log(`✅ Payment successful: ${userId} bought ${itemId}`);

    // Send confirmation
    const bot = new Telegraf(process.env.TOKEN_API_BOT);
    await bot.telegram.sendMessage(
      userId,
      `✅ Purchase Successful!\n\n` +
      `${item.icon} ${item.name}\n` +
      `${item.effect}\n\n` +
      `Boost activated! Start mining to see the effects.\n\n` +
      `Thank you for your purchase! 🎉`
    );

    return {
      success: true,
      userId,
      itemId,
      item
    };
  }

  return { success: false };
};
