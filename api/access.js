// Lifetime Access System - 1 TON one-time payment
// Users MUST pay 1 TON to unlock the app forever

const { Address } = require('@ton/core');
const db = require('../database/db');

// Payment configuration - from environment variables for security
const LIFETIME_ACCESS_PRICE = parseFloat(process.env.LIFETIME_ACCESS_PRICE || '1'); // 1 TON default
const PAYMENT_WALLET = process.env.OWNER_WALLET || process.env.PAYMENT_WALLET;

if (!PAYMENT_WALLET) {
  console.error('CRITICAL: OWNER_WALLET or PAYMENT_WALLET not set in environment variables');
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    try {
      // Check if user has lifetime access from database
      const hasAccess = await checkLifetimeAccess(userId);

      if (hasAccess) {
        return res.json({
          success: true,
          hasAccess: true,
          message: 'Lifetime access active'
        });
      }

      // User needs to pay
      return res.json({
        success: true,
        hasAccess: false,
        requiresPayment: true,
        payment: {
          amount: LIFETIME_ACCESS_PRICE,
          currency: 'TON',
          wallet: PAYMENT_WALLET,
          description: 'FasTapMining Lifetime Access - Pay once, mine forever!',
          deepLink: generatePaymentLink(userId)
        }
      });
    } catch (error) {
      console.error('Access check error:', error);
      return res.status(500).json({ error: 'Failed to check access' });
    }
  }

  if (req.method === 'POST') {
    const { userId, transactionHash, amount } = req.body;

    if (!userId || !transactionHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Verify transaction on TON blockchain
      const verified = await verifyTonTransaction(transactionHash, amount);

      if (!verified) {
        return res.status(400).json({
          error: 'Payment verification failed',
          message: 'Transaction not found or amount insufficient'
        });
      }

      // Grant lifetime access in database
      await grantLifetimeAccess(userId, transactionHash);

      return res.json({
        success: true,
        hasAccess: true,
        message: '🎉 Lifetime access activated! Welcome to FasTapMining!',
        transactionHash: transactionHash
      });
    } catch (error) {
      console.error('Access grant error:', error);
      return res.status(500).json({ error: 'Failed to grant access' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

async function checkLifetimeAccess(userId) {
  // Query database for user's lifetime access status
  try {
    const user = await db.User.findByTelegramId(userId);
    if (!user) {
      return false;
    }
    return user.has_lifetime_access === true;
  } catch (error) {
    console.error('Check lifetime access error:', error);
    return false;
  }
}

async function grantLifetimeAccess(userId, txHash) {
  // Grant access and save to database
  try {
    const user = await db.User.findByTelegramId(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await db.User.grantLifetimeAccess(user.id, txHash);
    
    console.log(`✅ Lifetime access granted to user ${userId} with tx ${txHash}`);
  } catch (error) {
    console.error('Grant lifetime access error:', error);
    throw error;
  }
}

function generatePaymentLink(userId) {
  // Generate TON payment deep link
  const comment = `FTMACCESS_${userId}`;
  const amountNano = LIFETIME_ACCESS_PRICE * 1000000000; // Convert TON to nanoTON

  return `ton://transfer/${PAYMENT_WALLET}?amount=${amountNano}&text=${comment}`;
}

async function verifyTonTransaction(txHash, amount) {
  // Verify transaction on TON blockchain using TonCenter API
  try {
    const apiKey = process.env.TONCENTER_API_KEY || '';
    
    // Query transaction details from TonCenter
    const response = await fetch(
      `https://toncenter.com/api/v2/getTransactions?address=${PAYMENT_WALLET}&limit=100`,
      {
        headers: apiKey ? { 'X-API-Key': apiKey } : {}
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error('TonCenter API error:', data);
      return false;
    }

    // Find matching transaction by hash or amount
    const tx = data.result.find(t => {
      const inMsg = t.in_msg;
      if (!inMsg) return false;

      const txAmount = parseInt(inMsg.value) / 1e9; // Convert nanoTON to TON
      
      // Match by hash (if available) or by amount and comment
      return (
        t.transaction_id?.hash === txHash ||
        (txAmount >= LIFETIME_ACCESS_PRICE && 
         inMsg.message?.includes('FTMACCESS_'))
      );
    });

    if (tx) {
      const txAmount = parseInt(tx.in_msg.value) / 1e9;
      console.log(`✅ Transaction verified: ${txHash}, amount: ${txAmount} TON`);
      return txAmount >= LIFETIME_ACCESS_PRICE;
    }

    console.warn(`❌ Transaction not found: ${txHash}`);
    return false;

  } catch (error) {
    console.error('Transaction verification error:', error);
    // Fail closed - don't grant access on error
    return false;
  }
}

// Webhook handler for TON blockchain notifications
module.exports.handleTonWebhook = async (webhookData) => {
  const { transaction, userId } = webhookData;

  try {
    if (transaction.amount >= LIFETIME_ACCESS_PRICE * 1e9) {
      await grantLifetimeAccess(userId, transaction.hash);

      return {
        success: true,
        message: 'Lifetime access granted via webhook'
      };
    }

    return { success: false, message: 'Insufficient amount' };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return { success: false, error: error.message };
  }
};

// Helper: Get all paid users count from database
module.exports.getPaidUsersCount = async () => {
  try {
    const { rows } = await db.query(
      'SELECT COUNT(*) FROM users WHERE has_lifetime_access = TRUE'
    );
    return parseInt(rows[0].count);
  } catch (error) {
    console.error('Get paid users count error:', error);
    return 0;
  }
};
