// Lifetime Access System - 1 TON one-time payment
// Users MUST pay 1 TON to unlock the app forever

const { Address } = require('@ton/core');

// Payment configuration
const LIFETIME_ACCESS_PRICE = 1; // 1 TON
const PAYMENT_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR'; // Your wallet

// Track paid users (in production: use database)
const paidUsers = new Set();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Check if user has lifetime access
    const hasAccess = checkLifetimeAccess(userId);

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
  }

  if (req.method === 'POST') {
    const { userId, transactionHash, amount } = req.body;

    if (!userId || !transactionHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify transaction on TON blockchain
    const verified = await verifyTonTransaction(transactionHash, amount);

    if (!verified) {
      return res.status(400).json({
        error: 'Payment verification failed',
        message: 'Transaction not found or amount insufficient'
      });
    }

    // Grant lifetime access
    grantLifetimeAccess(userId);

    return res.json({
      success: true,
      hasAccess: true,
      message: '🎉 Lifetime access activated! Welcome to FasTapMining!',
      transactionHash: transactionHash
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

function checkLifetimeAccess(userId) {
  // Check if user has paid
  // In production: query database
  return paidUsers.has(userId.toString());
}

function grantLifetimeAccess(userId) {
  // Grant access
  paidUsers.add(userId.toString());

  // In production: save to database
  // await db.users.update({ userId }, { lifetimeAccess: true, paidAt: Date.now() });

  console.log(`✅ Lifetime access granted to user ${userId}`);
}

function generatePaymentLink(userId) {
  // Generate TON payment deep link
  const comment = `FTMACCESS_${userId}`;
  const amountNano = LIFETIME_ACCESS_PRICE * 1000000000; // Convert TON to nanoTON

  return `ton://transfer/${PAYMENT_WALLET}?amount=${amountNano}&text=${comment}`;
}

async function verifyTonTransaction(txHash, amount) {
  // In production: verify transaction on TON blockchain
  // Use TON API to check:
  // 1. Transaction exists
  // 2. Amount is >= LIFETIME_ACCESS_PRICE
  // 3. Recipient is PAYMENT_WALLET
  // 4. Transaction is confirmed

  // For now: simulate verification
  console.log(`Verifying transaction: ${txHash}, amount: ${amount} TON`);

  // In production:
  // const tx = await tonApi.getTransaction(txHash);
  // return tx.destination === PAYMENT_WALLET && tx.amount >= LIFETIME_ACCESS_PRICE * 1e9;

  return amount >= LIFETIME_ACCESS_PRICE;
}

// Webhook handler for TON blockchain notifications
module.exports.handleTonWebhook = async (webhookData) => {
  const { transaction, userId } = webhookData;

  if (transaction.amount >= LIFETIME_ACCESS_PRICE * 1e9) {
    grantLifetimeAccess(userId);

    return {
      success: true,
      message: 'Lifetime access granted via webhook'
    };
  }

  return { success: false };
};

// Helper: Get all paid users count
module.exports.getPaidUsersCount = () => {
  return paidUsers.size;
};
