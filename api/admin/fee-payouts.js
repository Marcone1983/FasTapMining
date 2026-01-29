const express = require('express');
const router = express.Router();
const feePayoutService = require('../../services/fee-payout-service');
const logger = require('../../utils/logger').loggers.api;

/**
 * Process all pending platform fee payouts
 * POST /api/admin/fee-payouts/process
 */
router.post('/process', async (req, res) => {
  try {
    const { adminKey } = req.body;

    // Verify admin authorization
    if (adminKey !== process.env.ADMIN_KEY) {
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
 * GET /api/admin/fee-payouts/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { adminKey } = req.query;

    // Verify admin authorization
    if (adminKey !== process.env.ADMIN_KEY) {
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
 * GET /api/admin/fee-payouts/conversion/:exchangeId
 */
router.get('/conversion/:exchangeId', async (req, res) => {
  try {
    const { adminKey } = req.query;
    const { exchangeId } = req.params;

    // Verify admin authorization
    if (adminKey !== process.env.ADMIN_KEY) {
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
