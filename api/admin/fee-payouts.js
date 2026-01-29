const express = require('express');
const router = express.Router();
const feePayoutService = require('../../services/fee-payout-service');
const logger = require('../../utils/logger').loggers.api;
const { rateLimit } = require('../../middleware/security');
const { timingSafeEqual } = require('../../utils/crypto-helpers');

// Strict rate limiting for admin endpoints: 10 requests per minute
const adminRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.ip || 'admin'
});

/**
 * Process all pending platform fee payouts
 * POST /api/admin/fee-payouts/process
 */
router.post('/process', adminRateLimit, async (req, res) => {
  try {
    const { adminKey } = req.body;

    // Verify admin authorization with timing-safe comparison
    if (!adminKey || !process.env.ADMIN_KEY || !timingSafeEqual(adminKey, process.env.ADMIN_KEY)) {
      logger.warn('Unauthorized admin access attempt', {
        ip: req.ip,
        endpoint: '/process'
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      });
    }

    logger.info('🚀 Admin triggered fee payout processing...');

    const results = await feePayoutService.processAllPayouts();

    res.json({
      success: true,
      message: 'Fee payout processing completed',
      results: results
    });

  } catch (error) {
    logger.error('❌ Fee payout processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get platform fee statistics
 * POST /api/admin/fee-payouts/stats
 */
router.post('/stats', adminRateLimit, async (req, res) => {
  try {
    const { adminKey } = req.body;

    // Verify admin authorization with timing-safe comparison
    if (!adminKey || !process.env.ADMIN_KEY || !timingSafeEqual(adminKey, process.env.ADMIN_KEY)) {
      logger.warn('Unauthorized admin access attempt', {
        ip: req.ip,
        endpoint: '/stats'
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      });
    }

    const stats = await feePayoutService.getPayoutStats();

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    logger.error('❌ Fee stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Check ChangeNOW conversion status
 * POST /api/admin/fee-payouts/conversion/:exchangeId
 */
router.post('/conversion/:exchangeId', adminRateLimit, async (req, res) => {
  try {
    const { adminKey } = req.body;
    const { exchangeId } = req.params;

    // Verify admin authorization with timing-safe comparison
    if (!adminKey || !process.env.ADMIN_KEY || !timingSafeEqual(adminKey, process.env.ADMIN_KEY)) {
      logger.warn('Unauthorized admin access attempt', {
        ip: req.ip,
        endpoint: `/conversion/${exchangeId}`
      });
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - Invalid admin key'
      });
    }

    const status = await feePayoutService.checkConversionStatus(exchangeId);

    res.json({
      success: true,
      exchangeId: exchangeId,
      status: status
    });

  } catch (error) {
    logger.error('❌ Conversion status check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
