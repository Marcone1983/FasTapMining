const express = require('express');
const router = express.Router();
const referralService = require('../services/referral-service');
const db = require('../database/db');
const { validate, TYPES, commonSchemas } = require('../middleware/validate');
const { rateLimit } = require('../middleware/security');
const logger = require('../utils/logger').loggers.api;

// Rate limiting for referral endpoints
const referralReadRateLimit = rateLimit({
  windowMs: 60000,
  max: 60,
  keyGenerator: (req) => req.params?.telegramId || req.ip
});

const referralActionRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.body?.telegramId || req.ip
});

/**
 * Get user's referral code
 * GET /api/referrals/my-code/:telegramId
 */
router.get('/my-code/:telegramId',
  referralReadRateLimit,
  validate({
    params: {
      telegramId: commonSchemas.userId
    }
  }),
  async (req, res) => {
    try {
      const { telegramId } = req.validated;

      const result = await referralService.getUserReferralCode(telegramId);

      res.json(result);

    } catch (error) {
      logger.error('Referral code error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Process referral when new user joins
 * POST /api/referrals/process
 */
router.post('/process',
  referralActionRateLimit,
  validate({
    body: {
      telegramId: commonSchemas.userId,
      referralCode: { type: TYPES.STRING, required: true, pattern: /^[A-Za-z0-9_-]{3,50}$/, maxLength: 50 }
    }
  }),
  async (req, res) => {
    try {
      const { telegramId, referralCode } = req.validated;

      const result = await referralService.processReferral(telegramId, referralCode);

      res.json(result);

    } catch (error) {
      logger.error('Referral processing error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Get user's referral statistics
 * GET /api/referrals/stats/:telegramId
 */
router.get('/stats/:telegramId',
  referralReadRateLimit,
  validate({
    params: {
      telegramId: commonSchemas.userId
    }
  }),
  async (req, res) => {
    try {
      const { telegramId } = req.validated;

      const result = await referralService.getUserReferralStats(telegramId);

      res.json(result);

    } catch (error) {
      logger.error('Referral stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Get global referral leaderboard
 * GET /api/referrals/leaderboard
 */
router.get('/leaderboard',
  referralReadRateLimit,
  validate({
    query: {
      limit: { type: TYPES.INTEGER, required: false, min: 1, max: 100 }
    }
  }),
  async (req, res) => {
    try {
      const limit = req.validated.limit || 10;

      const result = await referralService.getLeaderboard(limit);

      res.json(result);

    } catch (error) {
      logger.error('Leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * Get system-wide referral statistics (admin only)
 * GET /api/referrals/system-stats
 */
router.get('/system-stats',
  referralReadRateLimit,
  validate({
    query: {
      adminKey: { type: TYPES.STRING, required: true, minLength: 10, maxLength: 500 }
    }
  }),
  async (req, res) => {
    try {
      const { adminKey } = req.validated;

      if (adminKey !== process.env.ADMIN_KEY) {
        logger.warn('Unauthorized system-stats access attempt', { ip: req.ip });
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const result = await referralService.getSystemStats();

      res.json(result);

    } catch (error) {
      logger.error('System stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

module.exports = router;
