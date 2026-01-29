// API endpoint to verify TON payment and unlock lifetime mining access
const db = require('../../database/db');
const lifetimeAccessService = require('../../services/lifetime-access-service');
const { validate, TYPES, commonSchemas } = require('../../middleware/validate');
const { rateLimit } = require('../../middleware/security');
const logger = require('../../utils/logger').loggers.payment;

// Rate limiting: 20 checks per minute per user
const checkPaymentRateLimit = rateLimit({
  windowMs: 60000,
  max: 20,
  keyGenerator: (req) => req.body?.userId || req.ip
});

const checkPaymentValidation = validate({
  body: {
    userId: commonSchemas.userId,
    walletAddress: commonSchemas.walletAddress
  }
});

async function checkPaymentHandler(req, res) {
  const { userId, walletAddress } = req.validated;

  try {
    // Get user from database
    const user = await db.User.findByTelegramId(userId.toString());

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if already has lifetime access
    if (user.has_lifetime_access) {
      return res.json({
        success: true,
        hasLifetimeAccess: true,
        alreadyUnlocked: true,
        message: 'Already have lifetime access'
      });
    }

    // OWNER TELEGRAM ID - FREE LIFETIME ACCESS (primary check)
    // Owner IDs from environment variable ONLY (no hardcoded secrets)
    const OWNER_TELEGRAM_IDS = (process.env.OWNER_TELEGRAM_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id);

    logger.info(`🔍 Checking owner: userId=${userId}, ownerIDs=${OWNER_TELEGRAM_IDS.join(',')}`);

    if (OWNER_TELEGRAM_IDS.includes(userId.toString())) {
      // Grant FREE lifetime access to owner by Telegram ID
      await db.query(
        'UPDATE users SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW(), wallet_address = $1 WHERE id = $2',
        [walletAddress, user.id]
      );

      logger.info(`👑 OWNER detected by Telegram ID - FREE lifetime access granted to user ${userId}`);

      return res.json({
        success: true,
        hasLifetimeAccess: true,
        ownerAccess: true,
        message: '👑 Owner Access - Lifetime mining unlocked FREE!'
      });
    }

    // OWNER WALLET - FREE LIFETIME ACCESS (secondary check)
    const OWNER_WALLET = process.env.OWNER_WALLET_TON;
    if (!OWNER_WALLET) {
      logger.error('❌ OWNER_WALLET_TON not configured - wallet check skipped');
    }

    // Normalize both addresses: remove spaces, convert to uppercase, extract hash part
    const normalizeWallet = (addr) => {
      if (!addr) return '';
      // Remove spaces and convert to uppercase
      let normalized = addr.replace(/\s/g, '').toUpperCase();
      // Extract the hash part (everything after UQ, EQ, or 0:)
      // This handles both bounce (EQ) and non-bounce (UQ) formats
      if (normalized.startsWith('UQ') || normalized.startsWith('EQ')) {
        normalized = normalized.substring(2); // Remove UQ or EQ prefix
      }
      return normalized;
    };

    const normalizedUserWallet = normalizeWallet(walletAddress);
    const normalizedOwnerWallet = normalizeWallet(OWNER_WALLET);

    // DEBUG LOG
    logger.info(`🔍 OWNER CHECK DEBUG:
      User ID: ${userId}
      User Wallet (raw): ${walletAddress}
      User Wallet (normalized hash): ${normalizedUserWallet}
      Owner Wallet (raw): ${OWNER_WALLET}
      Owner Wallet (normalized hash): ${normalizedOwnerWallet}
      Match: ${normalizedUserWallet === normalizedOwnerWallet}
    `);

    // Check if normalized hashes match (this handles UQ vs EQ formats)
    if (normalizedUserWallet === normalizedOwnerWallet) {
      // Grant FREE lifetime access to owner
      await db.query(
        'UPDATE users SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW(), wallet_address = $1 WHERE id = $2',
        [walletAddress, user.id]
      );

      logger.info(`👑 OWNER detected - FREE lifetime access granted to user ${userId}`);

      return res.json({
        success: true,
        hasLifetimeAccess: true,
        ownerAccess: true,
        message: '👑 Owner Access - Lifetime mining unlocked FREE!'
      });
    }

    // Verify payment on TON blockchain
    // This would normally query TON blockchain API to check for transaction
    // For now, we use the lifetime-access-service to handle payment verification

    const paymentVerified = await lifetimeAccessService.verifyDirectPayment(
      walletAddress,
      'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR', // Owner wallet
      1.0 // 1 TON
    );

    if (paymentVerified) {
      // Grant lifetime access
      await db.query(
        'UPDATE users SET has_lifetime_access = TRUE, lifetime_access_paid_at = NOW() WHERE id = $1',
        [user.id]
      );

      logger.info(`✅ Lifetime access granted to user ${userId} (paid 1 TON)`);

      return res.json({
        success: true,
        hasLifetimeAccess: true,
        message: 'Lifetime access unlocked! Mine forever!'
      });
    } else {
      // Payment not yet confirmed
      return res.json({
        success: false,
        hasLifetimeAccess: false,
        message: 'Payment not yet confirmed. Please wait a moment and try again.'
      });
    }

  } catch (error) {
    logger.error('Error checking payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Export with middleware
module.exports = async (req, res) => {
  return checkPaymentRateLimit(req, res, () => {
    return checkPaymentValidation(req, res, () => {
      return checkPaymentHandler(req, res);
    });
  });
};
