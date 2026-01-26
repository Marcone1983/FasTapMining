const db = require('../database/db');
const axios = require('axios');

/**
 * Marketplace Service
 * Handles purchase of boost items: AutoTap tiers, multipliers
 */
class MarketplaceService {
  constructor() {
    this.ownerWallet = process.env.OWNER_WALLET_TON;
    this.toncenterApiKey = process.env.TONCENTER_API_KEY;
    this.toncenterApi = 'https://toncenter.com/api/v2';

    this.items = {
      autotap_tier1: {
        name: 'AutoTap Tier 1',
        description: 'Automatic mining at 10 taps/second',
        price: parseFloat(process.env.AUTOTAP_TIER1_PRICE) || 0.5,
        duration: null, // Permanent
        tapsPerSecond: 10
      },
      autotap_tier2: {
        name: 'AutoTap Tier 2',
        description: 'Automatic mining at 50 taps/second',
        price: parseFloat(process.env.AUTOTAP_TIER2_PRICE) || 1.0,
        duration: null,
        tapsPerSecond: 50
      },
      autotap_tier3: {
        name: 'AutoTap Tier 3',
        description: 'Automatic mining at 100 taps/second',
        price: parseFloat(process.env.AUTOTAP_TIER3_PRICE) || 2.0,
        duration: null,
        tapsPerSecond: 100
      },
      multiplier_2x: {
        name: '2x Mining Multiplier',
        description: 'Double your mining rewards for 30 days',
        price: parseFloat(process.env.MULTIPLIER_2X_PRICE) || 0.3,
        duration: 30 * 24 * 60 * 60 * 1000, // 30 days
        multiplier: 2
      },
      multiplier_5x: {
        name: '5x Mining Multiplier',
        description: '5x mining rewards for 30 days',
        price: parseFloat(process.env.MULTIPLIER_5X_PRICE) || 0.8,
        duration: 30 * 24 * 60 * 60 * 1000,
        multiplier: 5
      },
      multiplier_10x: {
        name: '10x Mining Multiplier',
        description: '10x mining rewards for 30 days',
        price: parseFloat(process.env.MULTIPLIER_10X_PRICE) || 1.5,
        duration: 30 * 24 * 60 * 60 * 1000,
        multiplier: 10
      }
    };
  }

  /**
   * Get all marketplace items
   */
  getMarketplaceItems() {
    return Object.entries(this.items).map(([id, item]) => ({
      id: id,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: 'TON',
      isPermanent: !item.duration,
      durationDays: item.duration ? item.duration / (24 * 60 * 60 * 1000) : null,
      stats: {
        tapsPerSecond: item.tapsPerSecond || null,
        multiplier: item.multiplier || null
      }
    }));
  }

  /**
   * Create purchase request
   */
  async createPurchase(userId, telegramId, itemType) {
    try {
      // Validate item type
      if (!this.items[itemType]) {
        return {
          success: false,
          error: 'Invalid item type'
        };
      }

      const item = this.items[itemType];

      // Check if user already has this item active
      const existingPurchase = await db.query(
        `SELECT * FROM marketplace_purchases
         WHERE user_id = $1 AND item_type = $2 AND status = 'confirmed'
         AND (expires_on IS NULL OR expires_on > NOW())
         ORDER BY created_at DESC LIMIT 1`,
        [userId, itemType]
      );

      if (existingPurchase.rows.length > 0) {
        return {
          success: false,
          error: 'You already own this item',
          currentItem: existingPurchase.rows[0]
        };
      }

      // Check for pending payment
      const pendingPayment = await db.query(
        `SELECT * FROM marketplace_purchases
         WHERE user_id = $1 AND item_type = $2 AND status = 'pending'
         AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1`,
        [userId, itemType]
      );

      if (pendingPayment.rows.length > 0) {
        const payment = pendingPayment.rows[0];
        return {
          success: true,
          purchaseId: payment.id,
          itemType: itemType,
          itemName: item.name,
          price: parseFloat(payment.price),
          currency: payment.currency,
          paymentAddress: payment.payment_address,
          expiresAt: payment.expires_at,
          status: 'existing_pending'
        };
      }

      // Create new purchase
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const result = await db.query(
        `INSERT INTO marketplace_purchases
         (user_id, item_type, price, currency, payment_address, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
         RETURNING *`,
        [userId, itemType, item.price, 'TON', this.ownerWallet, 'pending', expiresAt]
      );

      const purchase = result.rows[0];

      console.log(`🛒 Created marketplace purchase for user ${userId}`);
      console.log(`   Item: ${item.name}`);
      console.log(`   Price: ${item.price} TON`);
      console.log(`   Expires: ${expiresAt.toISOString()}`);

      return {
        success: true,
        purchaseId: purchase.id,
        itemType: itemType,
        itemName: item.name,
        price: parseFloat(purchase.price),
        currency: purchase.currency,
        paymentAddress: purchase.payment_address,
        expiresAt: purchase.expires_at,
        expiresIn: Math.floor((new Date(purchase.expires_at) - new Date()) / 1000),
        status: 'created'
      };

    } catch (error) {
      console.error('❌ Error creating marketplace purchase:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check purchase payment status
   */
  async checkPurchasePayment(purchaseId) {
    try {
      const purchase = await db.query(
        `SELECT * FROM marketplace_purchases WHERE id = $1`,
        [purchaseId]
      );

      if (purchase.rows.length === 0) {
        return { success: false, error: 'Purchase not found' };
      }

      const purchaseData = purchase.rows[0];

      // Already confirmed
      if (purchaseData.status === 'confirmed') {
        return {
          success: true,
          status: 'confirmed',
          confirmedAt: purchaseData.confirmed_at,
          activatedAt: purchaseData.activated_at,
          expiresOn: purchaseData.expires_on,
          txHash: purchaseData.tx_hash
        };
      }

      // Check if expired
      if (new Date() > new Date(purchaseData.expires_at)) {
        await db.query(
          `UPDATE marketplace_purchases SET status = 'expired' WHERE id = $1`,
          [purchaseId]
        );
        return {
          success: false,
          status: 'expired',
          expiresAt: purchaseData.expires_at
        };
      }

      // Check blockchain for payment
      const transactions = await this.getWalletTransactions(this.ownerWallet);
      const matchingTx = this.findMatchingTransaction(
        transactions,
        purchaseData.price,
        purchaseData.created_at
      );

      if (matchingTx) {
        // Payment found! Activate item
        await this.activatePurchase(purchaseId, purchaseData.user_id, purchaseData.item_type, matchingTx.hash);

        return {
          success: true,
          status: 'confirmed',
          txHash: matchingTx.hash,
          amount: matchingTx.amount,
          confirmedAt: new Date(),
          itemActivated: true
        };
      }

      // Still pending
      return {
        success: true,
        status: 'pending',
        expiresAt: purchaseData.expires_at,
        timeRemaining: Math.floor((new Date(purchaseData.expires_at) - new Date()) / 1000)
      };

    } catch (error) {
      console.error('❌ Error checking purchase payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Activate purchased item
   */
  async activatePurchase(purchaseId, userId, itemType, txHash) {
    try {
      const item = this.items[itemType];
      const expiresOn = item.duration ? new Date(Date.now() + item.duration) : null;

      // Update purchase status
      await db.query(
        `UPDATE marketplace_purchases
         SET status = 'confirmed',
             confirmed_at = NOW(),
             activated_at = NOW(),
             expires_on = $1,
             tx_hash = $2
         WHERE id = $3`,
        [expiresOn, txHash, purchaseId]
      );

      // Apply item effects to user
      await this.applyItemEffects(userId, itemType, item);

      console.log(`✅ Marketplace item activated for user ${userId}`);
      console.log(`   Item: ${item.name}`);
      console.log(`   Purchase ID: ${purchaseId}`);
      console.log(`   TX Hash: ${txHash}`);
      if (expiresOn) {
        console.log(`   Expires: ${expiresOn.toISOString()}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Error activating purchase:', error);
      throw error;
    }
  }

  /**
   * Apply item effects to user account
   */
  async applyItemEffects(userId, itemType, item) {
    if (itemType.startsWith('autotap_')) {
      // Set AutoTap level
      const tier = itemType.split('_')[1];
      await db.query(
        `UPDATE users SET autotap_tier = $1, autotap_enabled = TRUE WHERE id = $2`,
        [tier, userId]
      );
    } else if (itemType.startsWith('multiplier_')) {
      // Set multiplier
      const multiplier = item.multiplier;
      const expiresOn = new Date(Date.now() + item.duration);
      await db.query(
        `UPDATE users
         SET mining_multiplier = $1,
             multiplier_expires_at = $2
         WHERE id = $3`,
        [multiplier, expiresOn, userId]
      );
    }
  }

  /**
   * Get user's active items
   */
  async getUserActiveItems(userId) {
    try {
      const purchases = await db.query(
        `SELECT * FROM marketplace_purchases
         WHERE user_id = $1 AND status = 'confirmed'
         AND (expires_on IS NULL OR expires_on > NOW())
         ORDER BY activated_at DESC`,
        [userId]
      );

      return purchases.rows.map(p => ({
        purchaseId: p.id,
        itemType: p.item_type,
        itemName: this.items[p.item_type]?.name || p.item_type,
        activatedAt: p.activated_at,
        expiresOn: p.expires_on,
        isPermanent: !p.expires_on,
        daysRemaining: p.expires_on ?
          Math.ceil((new Date(p.expires_on) - new Date()) / (24 * 60 * 60 * 1000)) : null
      }));

    } catch (error) {
      console.error('❌ Error getting user active items:', error);
      return [];
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
      if (tx.utime < createdAfterTimestamp) continue;

      if (tx.in_msg && tx.in_msg.value) {
        const receivedNanotons = parseInt(tx.in_msg.value);
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
   * Monitor pending purchases (background job)
   */
  async monitorPendingPurchases() {
    try {
      const pending = await db.query(
        `SELECT * FROM marketplace_purchases
         WHERE status = 'pending' AND expires_at > NOW()`
      );

      console.log(`🔍 Monitoring ${pending.rows.length} pending marketplace purchases...`);

      for (const purchase of pending.rows) {
        const result = await this.checkPurchasePayment(purchase.id);

        if (result.status === 'confirmed') {
          console.log(`✅ Purchase confirmed: ${purchase.id} (${purchase.item_type})`);
        }
      }

    } catch (error) {
      console.error('❌ Error monitoring purchases:', error);
    }
  }

  /**
   * Expire old pending purchases
   */
  async expireOldPurchases() {
    try {
      const result = await db.query(
        `UPDATE marketplace_purchases
         SET status = 'expired'
         WHERE status = 'pending' AND expires_at < NOW()
         RETURNING id`
      );

      if (result.rows.length > 0) {
        console.log(`⏰ Expired ${result.rows.length} old marketplace purchases`);
      }

    } catch (error) {
      console.error('❌ Error expiring purchases:', error);
    }
  }

  /**
   * Get marketplace statistics
   */
  async getStats() {
    try {
      const stats = await db.query(
        `SELECT
           item_type,
           COUNT(*) as total_sales,
           SUM(price) as total_revenue
         FROM marketplace_purchases
         WHERE status = 'confirmed'
         GROUP BY item_type`
      );

      const itemStats = {};
      let totalRevenue = 0;
      let totalSales = 0;

      for (const row of stats.rows) {
        itemStats[row.item_type] = {
          sales: parseInt(row.total_sales),
          revenue: parseFloat(row.total_revenue)
        };
        totalRevenue += parseFloat(row.total_revenue);
        totalSales += parseInt(row.total_sales);
      }

      return {
        itemStats: itemStats,
        totalSales: totalSales,
        totalRevenue: totalRevenue
      };

    } catch (error) {
      console.error('❌ Error getting marketplace stats:', error);
      return null;
    }
  }
}

module.exports = new MarketplaceService();
