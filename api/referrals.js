const express = require('express');
const router = express.Router();
const referralService = require('../services/referral-service');
const db = require('../database/db');

/**
 * Get user's referral code
 * GET /api/referrals/my-code/:telegramId
 */
router.get('/my-code/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    const result = await referralService.getUserReferralCode(telegramId);

    res.json(result);

  } catch (error) {
    console.error('❌ Referral code error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Process referral when new user joins
 * POST /api/referrals/process
 */
router.post('/process', async (req, res) => {
  try {
    const { telegramId, referralCode } = req.body;

    if (!telegramId || !referralCode) {
      return res.status(400).json({
        success: false,
        error: 'Telegram ID and referral code required'
      });
    }

    const result = await referralService.processReferral(telegramId, referralCode);

    res.json(result);

  } catch (error) {
    console.error('❌ Referral processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get user's referral statistics
 * GET /api/referrals/stats/:telegramId
 */
router.get('/stats/:telegramId', async (req, res) => {
  try {
    const { telegramId } = req.params;

    const result = await referralService.getUserReferralStats(telegramId);

    res.json(result);

  } catch (error) {
    console.error('❌ Referral stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get global referral leaderboard
 * GET /api/referrals/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const result = await referralService.getLeaderboard(limit);

    res.json(result);

  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get system-wide referral statistics (admin only)
 * GET /api/referrals/system-stats
 */
router.get('/system-stats', async (req, res) => {
  try {
    const { adminKey } = req.query;

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await referralService.getSystemStats();

    res.json(result);

  } catch (error) {
    console.error('❌ System stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
