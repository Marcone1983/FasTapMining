const express = require('express');
const router = express.Router();
const marketplaceService = require('../services/marketplace-service');
const db = require('../database/db');

/**
 * Get all marketplace items
 * GET /api/marketplace/items
 */
router.get('/items', async (req, res) => {
  try {
    const items = marketplaceService.getMarketplaceItems();

    res.json({
      success: true,
      items: items
    });

  } catch (error) {
    console.error('❌ Marketplace items error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Create purchase request
 * POST /api/marketplace/purchase
 */
router.post('/purchase', async (req, res) => {
  try {
    const { telegramId, itemType } = req.body;

    if (!telegramId || !itemType) {
      return res.status(400).json({
        success: false,
        error: 'Telegram ID and item type required'
      });
    }

    // Get or create user
    let user = await db.User.findByTelegramId(telegramId);
    if (!user) {
      user = await db.User.create({ telegram_id: telegramId });
    }

    // Create purchase
    const purchase = await marketplaceService.createPurchase(user.id, telegramId, itemType);

    if (!purchase.success) {
      return res.status(400).json(purchase);
    }

    res.json({
      success: true,
      purchase: {
        id: purchase.purchaseId,
        itemType: purchase.itemType,
        itemName: purchase.itemName,
        price: purchase.price,
        currency: purchase.currency,
        paymentAddress: purchase.paymentAddress,
        expiresAt: purchase.expiresAt,
        expiresIn: purchase.expiresIn,
        memo: `MKT_${user.id}_${itemType}`
      },
      instructions: {
        step1: `Send exactly ${purchase.price} TON to the address below`,
        step2: 'Include memo in transaction for faster confirmation',
        step3: 'Item will be activated within 1-2 minutes after payment',
        step4: 'Check your profile to see active boosts'
      }
    });

  } catch (error) {
    console.error('❌ Marketplace purchase error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check purchase payment status
 * GET /api/marketplace/check/:purchaseId
 */
router.get('/check/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;

    const result = await marketplaceService.checkPurchasePayment(purchaseId);

    res.json(result);

  } catch (error) {
    console.error('❌ Purchase check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's active items
 * GET /api/marketplace/my-items/:telegramId
 */
router.get('/my-items/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return res.json({
        success: true,
        activeItems: []
      });
    }

    const activeItems = await marketplaceService.getUserActiveItems(user.id);

    res.json({
      success: true,
      activeItems: activeItems
    });

  } catch (error) {
    console.error('❌ Active items error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get marketplace statistics (admin only)
 * GET /api/marketplace/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { adminKey } = req.query;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const stats = await marketplaceService.getStats();

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
