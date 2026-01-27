const db = require('../database/db');
const cryptoConverter = require('./crypto-converter');

// Fee Payout Service - Handles automated distribution of collected platform fees
class FeePayoutService {
  constructor() {
    this.minimumPayoutThresholds = {
      LTC: 0.01,
      DOGE: 10,
      BELLS: 100,
      LKY: 100,
      PEP: 100,
      JKC: 100,
      DINGO: 100,
      SHIC: 100
    };

    this.ownerWallets = {
      TON: process.env.OWNER_WALLET_TON,
      BELLS: process.env.OWNER_WALLET_BELLS,
      LKY: process.env.OWNER_WALLET_LKY,
      PEP: process.env.OWNER_WALLET_PEP,
      JKC: process.env.OWNER_WALLET_JKC,
      DINGO: process.env.OWNER_WALLET_DINGO,
      SHIC: process.env.OWNER_WALLET_SHIC
    };
  }

  /**
   * Process all pending fee payouts
   */
  async processAllPayouts() {
    console.log('🏦 Starting platform fee payout processing...');

    const results = {
      LTC: null,
      DOGE: null,
      BELLS: null,
      LKY: null,
      PEP: null,
      JKC: null,
      DINGO: null,
      SHIC: null,
      totalTONReceived: 0,
      errors: []
    };

    // Process LTC fees (convert to TON)
    try {
      results.LTC = await this.processLTCFees();
      if (results.LTC.success) {
        results.totalTONReceived += results.LTC.tonReceived;
      }
    } catch (error) {
      console.error('❌ LTC payout error:', error);
      results.errors.push({ coin: 'LTC', error: error.message });
    }

    // Process DOGE fees (convert to TON)
    try {
      results.DOGE = await this.processDOGEFees();
      if (results.DOGE.success) {
        results.totalTONReceived += results.DOGE.tonReceived;
      }
    } catch (error) {
      console.error('❌ DOGE payout error:', error);
      results.errors.push({ coin: 'DOGE', error: error.message });
    }

    // Process 6 small token fees (direct send to owner wallets)
    const smallTokens = ['BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];
    for (const token of smallTokens) {
      try {
        results[token] = await this.processSmallTokenFees(token);
      } catch (error) {
        console.error(`❌ ${token} payout error:`, error);
        results.errors.push({ coin: token, error: error.message });
      }
    }

    console.log('✅ Platform fee payout processing complete');
    console.log(`💰 Total TON received from conversions: ${results.totalTONReceived.toFixed(4)} TON`);

    return results;
  }

  /**
   * Process LTC fees - convert to TON
   */
  async processLTCFees() {
    const unpaidFees = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM platform_fees
       WHERE coin = 'LTC' AND paid_out = FALSE`
    );

    const totalLTC = parseFloat(unpaidFees.rows[0].total);

    if (totalLTC < this.minimumPayoutThresholds.LTC) {
      console.log(`⏳ LTC fees below threshold: ${totalLTC} < ${this.minimumPayoutThresholds.LTC}`);
      return { success: false, reason: 'below_threshold', amount: totalLTC };
    }

    console.log(`💸 Converting ${totalLTC} LTC to TON...`);

    // Create exchange via ChangeNOW
    const exchange = await cryptoConverter.createExchange(
      'LTC',
      'TON',
      totalLTC,
      this.ownerWallets.TON,
      this.ownerWallets.TON
    );

    if (!exchange.success) {
      return { success: false, error: exchange.error, amount: totalLTC };
    }

    // Mark fees as paid out
    await db.query(
      `UPDATE platform_fees
       SET paid_out = TRUE,
           paid_out_at = NOW(),
           payout_tx_hash = $1
       WHERE coin = 'LTC' AND paid_out = FALSE`,
      [exchange.exchangeId]
    );

    console.log(`✅ LTC conversion initiated: ${totalLTC} LTC → ~${exchange.toAmount} TON`);
    console.log(`📋 Exchange ID: ${exchange.exchangeId}`);
    console.log(`💳 Payin address: ${exchange.payinAddress}`);

    return {
      success: true,
      coin: 'LTC',
      amount: totalLTC,
      tonReceived: exchange.toAmount,
      exchangeId: exchange.exchangeId,
      payinAddress: exchange.payinAddress,
      status: exchange.status
    };
  }

  /**
   * Process DOGE fees - convert to TON
   */
  async processDOGEFees() {
    const unpaidFees = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM platform_fees
       WHERE coin = 'DOGE' AND paid_out = FALSE`
    );

    const totalDOGE = parseFloat(unpaidFees.rows[0].total);

    if (totalDOGE < this.minimumPayoutThresholds.DOGE) {
      console.log(`⏳ DOGE fees below threshold: ${totalDOGE} < ${this.minimumPayoutThresholds.DOGE}`);
      return { success: false, reason: 'below_threshold', amount: totalDOGE };
    }

    console.log(`💸 Converting ${totalDOGE} DOGE to TON...`);

    // Create exchange via ChangeNOW
    const exchange = await cryptoConverter.createExchange(
      'DOGE',
      'TON',
      totalDOGE,
      this.ownerWallets.TON,
      this.ownerWallets.TON
    );

    if (!exchange.success) {
      return { success: false, error: exchange.error, amount: totalDOGE };
    }

    // Mark fees as paid out
    await db.query(
      `UPDATE platform_fees
       SET paid_out = TRUE,
           paid_out_at = NOW(),
           payout_tx_hash = $1
       WHERE coin = 'DOGE' AND paid_out = FALSE`,
      [exchange.exchangeId]
    );

    console.log(`✅ DOGE conversion initiated: ${totalDOGE} DOGE → ~${exchange.toAmount} TON`);
    console.log(`📋 Exchange ID: ${exchange.exchangeId}`);
    console.log(`💳 Payin address: ${exchange.payinAddress}`);

    return {
      success: true,
      coin: 'DOGE',
      amount: totalDOGE,
      tonReceived: exchange.toAmount,
      exchangeId: exchange.exchangeId,
      payinAddress: exchange.payinAddress,
      status: exchange.status
    };
  }

  /**
   * Process small token fees - mark as ready for manual withdrawal
   */
  async processSmallTokenFees(coin) {
    const unpaidFees = await db.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM platform_fees
       WHERE coin = $1 AND paid_out = FALSE`,
      [coin]
    );

    const totalAmount = parseFloat(unpaidFees.rows[0].total);

    if (totalAmount < this.minimumPayoutThresholds[coin]) {
      console.log(`⏳ ${coin} fees below threshold: ${totalAmount} < ${this.minimumPayoutThresholds[coin]}`);
      return { success: false, reason: 'below_threshold', amount: totalAmount };
    }

    // For small tokens, we mark them as ready for withdrawal
    // Owner must manually withdraw from mining pool to their wallet
    const ownerWallet = this.ownerWallets[coin];

    await db.query(
      `UPDATE platform_fees
       SET paid_out = TRUE,
           paid_out_at = NOW(),
           payout_tx_hash = 'PENDING_WITHDRAWAL'
       WHERE coin = $1 AND paid_out = FALSE`,
      [coin]
    );

    console.log(`📦 ${coin} fees marked for withdrawal: ${totalAmount} ${coin} → ${ownerWallet}`);

    return {
      success: true,
      coin: coin,
      amount: totalAmount,
      ownerWallet: ownerWallet,
      status: 'marked_for_withdrawal',
      note: 'Owner must manually withdraw from mining pool'
    };
  }

  /**
   * Get payout statistics
   */
  async getPayoutStats() {
    const stats = {
      pending: {},
      paid: {},
      total: {}
    };

    const coins = ['LTC', 'DOGE', 'BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];

    for (const coin of coins) {
      // Pending fees
      const pending = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total
         FROM platform_fees
         WHERE coin = $1 AND paid_out = FALSE`,
        [coin]
      );

      // Paid fees
      const paid = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM platform_fees
         WHERE coin = $1 AND paid_out = TRUE`,
        [coin]
      );

      // Total fees
      const total = await db.query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM platform_fees
         WHERE coin = $1`,
        [coin]
      );

      stats.pending[coin] = parseFloat(pending.rows[0].total);
      stats.paid[coin] = {
        amount: parseFloat(paid.rows[0].total),
        count: parseInt(paid.rows[0].count)
      };
      stats.total[coin] = {
        amount: parseFloat(total.rows[0].total),
        count: parseInt(total.rows[0].count)
      };
    }

    return stats;
  }

  /**
   * Get conversion status from ChangeNOW
   */
  async checkConversionStatus(exchangeId) {
    return await cryptoConverter.getExchangeStatus(exchangeId);
  }
}

module.exports = new FeePayoutService();
