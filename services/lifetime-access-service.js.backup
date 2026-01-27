const db = require('../database/db');
const axios = require('axios');

/**
 * Lifetime Access Payment Service
 * Handles 1 TON payment for unlimited mining access
 */
class LifetimeAccessService {
  constructor() {
    this.price = parseFloat(process.env.LIFETIME_ACCESS_PRICE) || 1.0;
    this.ownerWallet = process.env.OWNER_WALLET_TON;
    this.toncenterApiKey = process.env.TONCENTER_API_KEY;
    this.toncenterApi = 'https://toncenter.com/api/v2';
    this.paymentExpirationMinutes = 60;
  }

  /**
   * Create lifetime access payment request
   */
  async createPaymentRequest(userId, telegramId) {
    try {
      // Check if user already has lifetime access
      const user = await db.User.findByTelegramId(telegramId);
      if (user && user.has_lifetime_access) {
        return {
          success: false,
          error: 'User already has lifetime access',
          hasAccess: true
        };
      }

      // Check for existing pending payment
      const existingPayment = await db.query(
        `SELECT * FROM lifetime_access_payments
         WHERE user_id = $1 AND status = 'pending' AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (existingPayment.rows.length > 0) {
        const payment = existingPayment.rows[0];
        return {
          success: true,
          paymentId: payment.id,
          amount: parseFloat(payment.amount),
          currency: payment.currency,
          paymentAddress: payment.payment_address,
          expiresAt: payment.expires_at,
          createdAt: payment.created_at,
          status: 'existing_pending'
        };
      }

      // Create new payment request
      const paymentId = `LTA_${userId}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + this.paymentExpirationMinutes * 60 * 1000);

      const result = await db.query(
        `INSERT INTO lifetime_access_payments
         (user_id, amount, currency, payment_address, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), $6)
         RETURNING *`,
        [userId, this.price, 'TON', this.ownerWallet, 'pending', expiresAt]
      );

      const payment = result.rows[0];

      console.log(`💳 Created lifetime access payment request for user ${userId}`);
      console.log(`   Amount: ${this.price} TON`);
      console.log(`   Wallet: ${this.ownerWallet}`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);

      return {
        success: true,
        paymentId: payment.id,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        paymentAddress: payment.payment_address,
        expiresAt: payment.expires_at,
        createdAt: payment.created_at,
        status: 'created'
      };

    } catch (error) {
      console.error('❌ Error creating lifetime access payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check payment status on TON blockchain
   */
  async checkPayment(paymentId) {
    try {
      const payment = await db.query(
        `SELECT * FROM lifetime_access_payments WHERE id = $1`,
        [paymentId]
      );

      if (payment.rows.length === 0) {
        return { success: false, error: 'Payment not found' };
      }

      const paymentData = payment.rows[0];

      // Already confirmed
      if (paymentData.status === 'confirmed') {
        return {
          success: true,
          status: 'confirmed',
          confirmedAt: paymentData.confirmed_at,
          txHash: paymentData.tx_hash
        };
      }

      // Check if expired
      if (new Date() > new Date(paymentData.expires_at)) {
        await db.query(
          `UPDATE lifetime_access_payments SET status = 'expired' WHERE id = $1`,
          [paymentId]
        );
        return {
          success: false,
          status: 'expired',
          expiresAt: paymentData.expires_at
        };
      }

      // Check blockchain for payment
      const transactions = await this.getWalletTransactions(this.ownerWallet);
      const matchingTx = this.findMatchingTransaction(
        transactions,
        paymentData.amount,
        paymentData.created_at
      );

      if (matchingTx) {
        // Payment found! Confirm it
        await this.confirmPayment(paymentId, paymentData.user_id, matchingTx.hash);

        return {
          success: true,
          status: 'confirmed',
          txHash: matchingTx.hash,
          amount: matchingTx.amount,
          confirmedAt: new Date()
        };
      }

      // Still pending
      return {
        success: true,
        status: 'pending',
        expiresAt: paymentData.expires_at,
        timeRemaining: Math.floor((new Date(paymentData.expires_at) - new Date()) / 1000)
      };

    } catch (error) {
      console.error('❌ Error checking payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm payment and grant lifetime access
   */
  async confirmPayment(paymentId, userId, txHash) {
    try {
      // Update payment status
      await db.query(
        `UPDATE lifetime_access_payments
         SET status = 'confirmed', confirmed_at = NOW(), tx_hash = $1
         WHERE id = $2`,
        [txHash, paymentId]
      );

      // Grant lifetime access to user
      await db.query(
        `UPDATE users
         SET has_lifetime_access = TRUE, lifetime_access_granted_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      console.log(`✅ Lifetime access granted to user ${userId}`);
      console.log(`   Payment ID: ${paymentId}`);
      console.log(`   TX Hash: ${txHash}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Get wallet transactions from TON blockchain
   */
  async getWalletTransactions(wallet) {
    try {
      const response = await axios.get(`${this.toncenterApi}/getTransactions`, {
        params: {
          address: wallet,
          limit: 100,
          api_key: this.toncenterApiKey
        }
      });

      if (!response.data.ok) {
        throw new Error('TON API error: ' + response.data.error);
      }

      return response.data.result || [];

    } catch (error) {
      console.error('❌ Error fetching TON transactions:', error.message);
      return [];
    }
  }

  /**
   * Find matching transaction
   */
  findMatchingTransaction(transactions, expectedAmount, createdAfter) {
    const expectedNanotons = Math.floor(expectedAmount * 1e9);
    const createdAfterTimestamp = Math.floor(new Date(createdAfter).getTime() / 1000);

    for (const tx of transactions) {
      // Skip if transaction is older than payment creation
      if (tx.utime < createdAfterTimestamp) continue;

      // Check incoming messages
      if (tx.in_msg && tx.in_msg.value) {
        const receivedNanotons = parseInt(tx.in_msg.value);

        // Allow 1% tolerance for gas fees
        const tolerance = expectedNanotons * 0.01;
        if (Math.abs(receivedNanotons - expectedNanotons) <= tolerance) {
          return {
            hash: tx.transaction_id.hash,
            amount: receivedNanotons / 1e9,
            timestamp: tx.utime
          };
        }
      }
    }

    return null;
  }

  /**
   * Monitor all pending payments (background job)
   */
  async monitorPendingPayments() {
    try {
      const pendingPayments = await db.query(
        `SELECT * FROM lifetime_access_payments
         WHERE status = 'pending' AND expires_at > NOW()`
      );

      console.log(`🔍 Monitoring ${pendingPayments.rows.length} pending payments...`);

      for (const payment of pendingPayments.rows) {
        const result = await this.checkPayment(payment.id);

        if (result.status === 'confirmed') {
          console.log(`✅ Payment confirmed: ${payment.id}`);
        }
      }

    } catch (error) {
      console.error('❌ Error monitoring payments:', error);
    }
  }

  /**
   * Expire old pending payments
   */
  async expireOldPayments() {
    try {
      const result = await db.query(
        `UPDATE lifetime_access_payments
         SET status = 'expired'
         WHERE status = 'pending' AND expires_at < NOW()
         RETURNING id`
      );

      if (result.rows.length > 0) {
        console.log(`⏰ Expired ${result.rows.length} old payments`);
      }

    } catch (error) {
      console.error('❌ Error expiring payments:', error);
    }
  }

  /**
   * Verify direct payment from user wallet to owner wallet
   * Used for TON Connect direct payments
   */
  async verifyDirectPayment(fromWallet, toWallet, expectedAmount) {
    try {
      console.log(`🔍 Verifying direct payment:`);
      console.log(`   From: ${fromWallet}`);
      console.log(`   To: ${toWallet}`);
      console.log(`   Expected: ${expectedAmount} TON`);

      // Get recent transactions for the owner wallet
      const transactions = await this.getWalletTransactions(toWallet);

      if (transactions.length === 0) {
        console.log('⚠️  No recent transactions found');
        return false;
      }

      const expectedNanotons = Math.floor(expectedAmount * 1e9);
      const recentTimeThreshold = Date.now() / 1000 - 600; // Last 10 minutes

      // Look for matching transaction
      for (const tx of transactions) {
        // Skip old transactions
        if (tx.utime < recentTimeThreshold) continue;

        // Check incoming messages
        if (tx.in_msg && tx.in_msg.value && tx.in_msg.source) {
          const receivedNanotons = parseInt(tx.in_msg.value);
          const sourceAddress = tx.in_msg.source;

          // Allow 2% tolerance for gas fees
          const tolerance = expectedNanotons * 0.02;
          const amountMatches = Math.abs(receivedNanotons - expectedNanotons) <= tolerance;

          // Check if sender matches (case-insensitive, handle different formats)
          const senderMatches = sourceAddress.toLowerCase().includes(fromWallet.toLowerCase().slice(-20)) ||
                               fromWallet.toLowerCase().includes(sourceAddress.toLowerCase().slice(-20));

          if (amountMatches && senderMatches) {
            console.log(`✅ Payment verified!`);
            console.log(`   TX Hash: ${tx.transaction_id.hash}`);
            console.log(`   Amount: ${receivedNanotons / 1e9} TON`);
            console.log(`   Time: ${new Date(tx.utime * 1000).toISOString()}`);
            return true;
          }

          if (amountMatches) {
            console.log(`⚠️  Amount matches but sender doesn't: ${sourceAddress}`);
          }
        }
      }

      console.log('❌ No matching transaction found');
      return false;

    } catch (error) {
      console.error('❌ Error verifying direct payment:', error);
      return false;
    }
  }

  /**
   * Get payment statistics
   */
  async getStats() {
    try {
      const stats = await db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
           COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
           COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
           COALESCE(SUM(amount) FILTER (WHERE status = 'confirmed'), 0) as total_revenue,
           COUNT(DISTINCT user_id) FILTER (WHERE status = 'confirmed') as unique_buyers
         FROM lifetime_access_payments`
      );

      return {
        pending: parseInt(stats.rows[0].pending_count),
        confirmed: parseInt(stats.rows[0].confirmed_count),
        expired: parseInt(stats.rows[0].expired_count),
        totalRevenue: parseFloat(stats.rows[0].total_revenue),
        uniqueBuyers: parseInt(stats.rows[0].unique_buyers)
      };

    } catch (error) {
      console.error('❌ Error getting payment stats:', error);
      return null;
    }
  }
}

module.exports = new LifetimeAccessService();
