const express = require('express');
const router = express.Router();
const marketplaceService = require('../services/marketplace-service');
const db = require('../database/db');
const { validate, TYPES, commonSchemas } = require('../middleware/validate');
const { rateLimit } = require('../middleware/security');
const logger = require('../utils/logger').loggers.payment;

// Rate limiting
const marketplaceReadRateLimit = rateLimit({
  windowMs: 60000,
  max: 60,
  keyGenerator: (req) => req.params?.telegramId || req.params?.purchaseId || req.ip
});

const marketplacePurchaseRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.body?.telegramId || req.ip
});

/**
 * Get all marketplace items
 * GET /api/marketplace/items
 */
router.get('/items', marketplaceReadRateLimit, async (req, res) => {
  try {
    const items = marketplaceService.getMarketplaceItems();

    res.json({
      success: true,
      items: items
    });

  } catch (error) {
    logger.error('❌ Marketplace items error:', error);
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
router.post('/purchase',
  marketplacePurchaseRateLimit,
  validate({
    body: {
      telegramId: commonSchemas.userId,
      itemType: { type: TYPES.STRING, required: true, pattern: /^[a-z0-9_-]+$/, maxLength: 50 }
    }
  }),
  async (req, res) => {
    try {
      const { telegramId, itemType } = req.validated;

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
    logger.error('❌ Marketplace purchase error:', error);
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
router.get('/check/:purchaseId',
  marketplaceReadRateLimit,
  validate({
    params: {
      purchaseId: { type: TYPES.STRING, required: true, pattern: /^MKT_[0-9]+_[a-z0-9_-]+$/i, maxLength: 100 }
    }
  }),
  async (req, res) => {
    try {
      const { purchaseId } = req.validated;

    const result = await marketplaceService.checkPurchasePayment(purchaseId);

    res.json(result);

  } catch (error) {
    logger.error('❌ Purchase check error:', error);
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
router.get('/my-items/:telegramId',
  marketplaceReadRateLimit,
  validate({
    params: {
      telegramId: commonSchemas.userId
    }
  }),
  async (req, res) => {
    try {
      const { telegramId } = req.validated;

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
    logger.error('❌ Active items error:', error);
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
router.get('/stats',
  marketplaceReadRateLimit,
  validate({
    query: {
      adminKey: { type: TYPES.STRING, required: true, minLength: 10, maxLength: 500 }
    }
  }),
  async (req, res) => {
    try {
      const { adminKey } = req.validated;

      if (adminKey !== process.env.ADMIN_KEY) {
        logger.warn('Unauthorized marketplace stats access attempt', { ip: req.ip });
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
    logger.error('❌ Stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
