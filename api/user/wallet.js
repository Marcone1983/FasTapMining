const db = require('../../database/db');
const { validate, TYPES, commonSchemas } = require('../../middleware/validate');
const { rateLimit } = require('../../middleware/security');
const logger = require('../../utils/logger').loggers.api;

// Rate limiting: 10 wallet updates per minute per user
const walletRateLimit = rateLimit({
  windowMs: 60000,
  max: 10,
  keyGenerator: (req) => req.body?.userId || req.ip
});

const walletValidation = validate({
  body: {
    userId: commonSchemas.userId,
    walletAddress: commonSchemas.walletAddress
  }
});

async function walletHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, walletAddress } = req.validated;

  try {
    // Find or create user
    let user = await db.User.findByTelegramId(userId);

    if (!user) {
      user = await db.User.create({
        telegram_id: userId,
        username: `user_${userId}`,
        wallet_address: walletAddress,
        referral_code: generateReferralCode(userId)
      });
    } else {
      // Update wallet address
      await db.query(
        'UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE id = $2',
        [walletAddress, user.id]
      );
    }

    return res.json({
      success: true,
      message: 'Wallet address saved successfully',
      walletAddress: walletAddress
    });
  } catch (error) {
    logger.error('Save wallet error:', error);
    return res.status(500).json({
      error: 'Failed to save wallet address',
      message: error.message
    });
  }
}

// Export with middleware
module.exports = async (req, res) => {
  return walletRateLimit(req, res, () => {
    return walletValidation(req, res, () => {
      return walletHandler(req, res);
    });
  });
};

function generateReferralCode(userId) {
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}
