const express = require('express');
const router = express.Router();
const lifetimeAccessService = require('../services/lifetime-access-service');
const db = require('../database/db');

/**
 * Create lifetime access payment request
 * POST /api/lifetime-access/create
 */
router.post('/create', async (req, res) => {
  try {
    const { telegramId } = req.body;

    if (!telegramId) {
      return res.status(400).json({
        success: false,
        error: 'Telegram ID required'
      });
    }

    // Get or create user
    let user = await db.User.findByTelegramId(telegramId);
    if (!user) {
      user = await db.User.create({ telegram_id: telegramId });
    }

    // Create payment request
    const payment = await lifetimeAccessService.createPaymentRequest(user.id, telegramId);

    if (!payment.success) {
      return res.status(400).json(payment);
    }

    res.json({
      success: true,
      payment: {
        id: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        paymentAddress: payment.paymentAddress,
        expiresAt: payment.expiresAt,
        expiresIn: Math.floor((new Date(payment.expiresAt) - new Date()) / 1000),
        memo: `LTA_${user.id}` // Payment memo for identification
      },
      instructions: {
        step1: `Send exactly ${payment.amount} TON to the address below`,
        step2: 'Include memo in transaction for faster confirmation',
        step3: 'Payment will be confirmed within 1-2 minutes',
        step4: 'You will receive lifetime mining access immediately after confirmation'
      }
    });

  } catch (error) {
    console.error('❌ Lifetime access creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check payment status
 * GET /api/lifetime-access/check/:paymentId
 */
router.get('/check/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const result = await lifetimeAccessService.checkPayment(paymentId);

    res.json(result);

  } catch (error) {
    console.error('❌ Payment check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's lifetime access status
 * GET /api/lifetime-access/status/:telegramId
 */
router.get('/status/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    const user = await db.User.findByTelegramId(telegramId);

    if (!user) {
      return res.json({
        success: true,
        hasLifetimeAccess: false,
        status: 'no_account'
      });
    }

    res.json({
      success: true,
      hasLifetimeAccess: user.has_lifetime_access || false,
      grantedAt: user.lifetime_access_granted_at || null,
      status: user.has_lifetime_access ? 'active' : 'none'
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get payment statistics (admin only)
 * GET /api/lifetime-access/stats
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

    const stats = await lifetimeAccessService.getStats();

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
