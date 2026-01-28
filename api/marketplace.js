const marketplaceService = require('../services/marketplace-service');
const db = require('../database/db');
const { validate, TYPES, commonSchemas } = require('../middleware/validate');
const { rateLimit } = require('../middleware/security');
const logger = require('../utils/logger').loggers.payment;

// Rate limiting
const marketplaceReadRateLimit = rateLimit({
  windowMs: 60000,
  max: 60,
  keyGenerator: (req) => req.query?.telegramId || req.query?.purchaseId || req.ip
});

const marketplacePurchaseRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.body?.telegramId || req.ip
});

/**
 * Marketplace API Handler - Vercel Serverless Compatible
 */
module.exports = async (req, res) => {
  const { method, query, body } = req;
  const path = query.path || '';

  try {
    // GET /api/marketplace?path=items
    if (method === 'GET' && path === 'items') {
      await marketplaceReadRateLimit(req, res, async () => {
        const items = marketplaceService.getMarketplaceItems();
        res.json({ success: true, items });
      });
      return;
    }

    // POST /api/marketplace?path=purchase
    if (method === 'POST' && path === 'purchase') {
      await marketplacePurchaseRateLimit(req, res, async () => {
        await validate({
          body: {
            telegramId: commonSchemas.userId,
            itemType: { type: TYPES.STRING, required: true, pattern: /^[a-z0-9_-]+$/, maxLength: 50 }
          }
        })(req, res, async () => {
          const { telegramId, itemType } = req.validated;

          let user = await db.User.findByTelegramId(telegramId);
          if (!user) {
            user = await db.User.create({ telegram_id: telegramId });
          }

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
        });
      });
      return;
    }

    // GET /api/marketplace?path=check&purchaseId=XXX
    if (method === 'GET' && path === 'check') {
      await marketplaceReadRateLimit(req, res, async () => {
        await validate({
          query: {
            purchaseId: { type: TYPES.STRING, required: true, pattern: /^MKT_[0-9]+_[a-z0-9_-]+$/i, maxLength: 100 }
          }
        })(req, res, async () => {
          const { purchaseId } = req.validated;
          const result = await marketplaceService.checkPurchasePayment(purchaseId);
          res.json(result);
        });
      });
      return;
    }

    // GET /api/marketplace?path=my-items&telegramId=XXX
    if (method === 'GET' && path === 'my-items') {
      await marketplaceReadRateLimit(req, res, async () => {
        await validate({
          query: {
            telegramId: commonSchemas.userId
          }
        })(req, res, async () => {
          const { telegramId } = req.validated;
          const user = await db.User.findByTelegramId(telegramId);

          if (!user) {
            return res.json({ success: true, activeItems: [] });
          }

          const activeItems = await marketplaceService.getUserActiveItems(user.id);
          res.json({ success: true, activeItems });
        });
      });
      return;
    }

    // GET /api/marketplace?path=stats&adminKey=XXX
    if (method === 'GET' && path === 'stats') {
      await marketplaceReadRateLimit(req, res, async () => {
        await validate({
          query: {
            adminKey: { type: TYPES.STRING, required: true, minLength: 10, maxLength: 500 }
          }
        })(req, res, async () => {
          const { adminKey } = req.validated;

          if (adminKey !== process.env.ADMIN_KEY) {
            logger.warn('Unauthorized marketplace stats access attempt', { ip: req.ip });
            return res.status(401).json({ success: false, error: 'Unauthorized' });
          }

          const stats = await marketplaceService.getStats();
          res.json({ success: true, stats });
        });
      });
      return;
    }

    // 404 - Path not found
    res.status(404).json({
      success: false,
      error: 'Not found',
      availablePaths: ['items', 'purchase', 'check', 'my-items', 'stats']
    });

  } catch (error) {
    logger.error('❌ Marketplace error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
