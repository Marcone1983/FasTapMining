// Real Referral System - Earn rewards for inviting friends

const referralData = new Map(); // In production: use database

// Referral rewards configuration
const REFERRAL_REWARDS = {
  referrer: {
    MineX: 100,    // Reward to person who invited
    tBTC: 5,
    MRDN: 500
  },
  referred: {
    MineX: 50,     // Reward to person who joined
    tBTC: 2,
    MRDN: 250
  }
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Generate referral code
    const referralCode = generateReferralCode(userId);

    // Get referral stats
    const stats = getReferralStats(userId);

    // Calculate total earnings from referrals
    const totalEarnings = {
      MineX: stats.count * REFERRAL_REWARDS.referrer.MineX,
      tBTC: stats.count * REFERRAL_REWARDS.referrer.tBTC,
      MRDN: stats.count * REFERRAL_REWARDS.referrer.MRDN
    };

    return res.json({
      success: true,
      referralCode: referralCode,
      referralLink: `https://t.me/YourBotName?start=${referralCode}`,
      stats: {
        totalReferrals: stats.count,
        activeReferrals: stats.active,
        earnings: totalEarnings
      },
      rewards: REFERRAL_REWARDS
    });
  }

  if (req.method === 'POST') {
    const { userId, referralCode } = req.body;

    if (!userId || !referralCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Decode referral code to get referrer ID
    const referrerId = decodeReferralCode(referralCode);

    if (!referrerId || referrerId === userId) {
      return res.status(400).json({ error: 'Invalid referral code' });
    }

    // Check if user already used a referral
    if (hasUsedReferral(userId)) {
      return res.status(400).json({ error: 'Referral already used' });
    }

    // Track referral
    trackReferral(referrerId, userId);

    // Give rewards to both users
    const referrerReward = REFERRAL_REWARDS.referrer;
    const referredReward = REFERRAL_REWARDS.referred;

    // In production: save to database
    console.log(`Referral success: ${userId} invited by ${referrerId}`);

    return res.json({
      success: true,
      referrerId: referrerId,
      rewards: {
        youReceived: referredReward,
        referrerReceived: referrerReward
      },
      message: `🎉 Referral bonus received! You earned ${referredReward.MineX} MineX, ${referredReward.tBTC} tBTC, ${referredReward.MRDN} MRDN!`
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function generateReferralCode(userId) {
  // Generate unique referral code
  const code = Buffer.from(userId.toString()).toString('base64url').slice(0, 8);
  return `FTM${code}`;
}

function decodeReferralCode(code) {
  try {
    if (!code.startsWith('FTM')) return null;
    const base64 = code.slice(3);
    const userId = Buffer.from(base64, 'base64url').toString();
    return parseInt(userId);
  } catch (e) {
    return null;
  }
}

function getReferralStats(userId) {
  const data = referralData.get(userId) || { referrals: [] };

  return {
    count: data.referrals.length,
    active: data.referrals.filter(r => r.isActive).length,
    list: data.referrals
  };
}

function trackReferral(referrerId, referredId) {
  const data = referralData.get(referrerId) || { referrals: [] };

  data.referrals.push({
    userId: referredId,
    joinedAt: Date.now(),
    isActive: true
  });

  referralData.set(referrerId, data);

  // Mark that referred user has used a referral
  referralData.set(`used:${referredId}`, referrerId);
}

function hasUsedReferral(userId) {
  return referralData.has(`used:${userId}`);
}
