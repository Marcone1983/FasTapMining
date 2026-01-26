const db = require('../../database/db');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    return res.status(400).json({ error: 'Missing userId or walletAddress' });
  }

  // Validate TON address format
  if (!walletAddress.startsWith('UQ') && !walletAddress.startsWith('EQ')) {
    return res.status(400).json({ error: 'Invalid TON address format' });
  }

  if (walletAddress.length !== 48) {
    return res.status(400).json({ error: 'Invalid TON address length' });
  }

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
    console.error('Save wallet error:', error);
    return res.status(500).json({
      error: 'Failed to save wallet address',
      message: error.message
    });
  }
};

function generateReferralCode(userId) {
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}
