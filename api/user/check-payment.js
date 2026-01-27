// API endpoint to verify TON payment and unlock lifetime mining access
const db = require('../../database/db');
const lifetimeAccessService = require('../../services/lifetime-access-service');

module.exports = async (req, res) => {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    return res.status(400).json({
      success: false,
      error: 'User ID and wallet address required'
    });
  }

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

      console.log(`✅ Lifetime access granted to user ${userId} (paid 1 TON)`);

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
    console.error('Error checking payment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
