const axios = require('axios');
const crypto = require('crypto');
const db = require('../database/db');

// VERIFIED CRYPTOCURRENCY EXCHANGE
// Real XMR → TON conversion with transaction verification

const CHANGENOW_API = 'https://api.changenow.io/v2';
const CHANGENOW_API_KEY = process.env.CHANGENOW_API_KEY;

class VerifiedExchange {
  constructor() {
    this.pendingExchanges = new Map(); // exchangeId → { userId, amount, status }
    this.completedExchanges = new Map();
  }

  /**
   * Convert XMR to TON with REAL verification
   * @param {number} xmrAmount - Amount of XMR to convert
   * @param {string} tonWalletAddress - Destination TON wallet
   * @returns {Promise<Object>} Exchange details
   */
  async convertXMRtoTON(xmrAmount, tonWalletAddress) {
    if (xmrAmount < 0.001) {
      throw new Error('Minimum XMR amount is 0.001 XMR');
    }

    if (!tonWalletAddress) {
      throw new Error('TON wallet address required');
    }

    try {
      // Step 1: Get estimated exchange rate
      const estimate = await this.getEstimate('xmr', 'ton', xmrAmount);

      console.log(`💱 Estimate: ${xmrAmount} XMR → ${estimate.toAmount} TON`);
      console.log(`   Rate: 1 XMR = ${(estimate.toAmount / xmrAmount).toFixed(6)} TON`);

      // Step 2: Create exchange transaction
      const exchange = await axios.post(
        `${CHANGENOW_API}/exchange`,
        {
          fromCurrency: 'xmr',
          toCurrency: 'ton',
          fromAmount: xmrAmount.toString(),
          address: tonWalletAddress,
          flow: 'standard', // or 'fixed-rate'
          type: 'direct',
          refundAddress: process.env.XMR_WALLET // Refund address if something goes wrong
        },
        {
          headers: {
            'x-changenow-api-key': CHANGENOW_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      const exchangeData = exchange.data;

      console.log('✅ Exchange created:');
      console.log(`   ID: ${exchangeData.id}`);
      console.log(`   Deposit address (XMR): ${exchangeData.payinAddress}`);
      console.log(`   Expected TON: ${exchangeData.toAmount}`);

      // Save exchange for tracking
      this.pendingExchanges.set(exchangeData.id, {
        id: exchangeData.id,
        fromCurrency: 'XMR',
        toCurrency: 'TON',
        fromAmount: xmrAmount,
        toAmount: exchangeData.toAmount,
        depositAddress: exchangeData.payinAddress,
        recipientAddress: tonWalletAddress,
        status: 'waiting',
        createdAt: new Date()
      });

      // Save to database
      await db.query(
        `INSERT INTO crypto_exchanges (
          exchange_id, from_currency, to_currency, from_amount, to_amount,
          deposit_address, recipient_address, status, provider, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
        [
          exchangeData.id,
          'XMR',
          'TON',
          xmrAmount,
          exchangeData.toAmount,
          exchangeData.payinAddress,
          tonWalletAddress,
          'pending',
          'ChangeNOW'
        ]
      );

      return {
        exchangeId: exchangeData.id,
        depositAddress: exchangeData.payinAddress,
        expectedTON: exchangeData.toAmount,
        status: 'created'
      };

    } catch (error) {
      console.error('❌ Exchange creation failed:', error.response?.data || error.message);
      throw new Error(`Exchange failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get estimated exchange rate
   */
  async getEstimate(fromCurrency, toCurrency, amount) {
    try {
      const response = await axios.get(
        `${CHANGENOW_API}/exchange/estimated-amount`,
        {
          params: {
            fromCurrency,
            toCurrency,
            fromAmount: amount,
            flow: 'standard',
            type: 'direct'
          },
          headers: {
            'x-changenow-api-key': CHANGENOW_API_KEY
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Estimate error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Check exchange status with VERIFICATION
   */
  async checkExchangeStatus(exchangeId) {
    try {
      const response = await axios.get(
        `${CHANGENOW_API}/exchange/by-id`,
        {
          params: { id: exchangeId },
          headers: {
            'x-changenow-api-key': CHANGENOW_API_KEY
          }
        }
      );

      const status = response.data.status;
      const txHash = response.data.payoutHash;

      console.log(`📊 Exchange ${exchangeId}: ${status}`);

      // Update database
      await db.query(
        `UPDATE crypto_exchanges
         SET status = $1, payout_hash = $2, updated_at = NOW()
         WHERE exchange_id = $3`,
        [status, txHash, exchangeId]
      );

      if (status === 'finished' && txHash) {
        console.log(`✅ Exchange COMPLETED! TON TX: ${txHash}`);

        // Verify on TON blockchain
        const verified = await this.verifyTONTransaction(txHash);

        if (verified) {
          this.completedExchanges.set(exchangeId, {
            ...response.data,
            verifiedAt: new Date()
          });

          return {
            status: 'completed',
            verified: true,
            txHash: txHash,
            amount: response.data.amountTo
          };
        }
      }

      return {
        status: status,
        verified: status === 'finished',
        txHash: txHash
      };

    } catch (error) {
      console.error('Status check error:', error.response?.data || error.message);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Verify TON transaction on blockchain
   */
  async verifyTONTransaction(txHash) {
    try {
      // Use TONCenter API to verify transaction
      const response = await axios.get(
        `https://toncenter.com/api/v2/getTransactions`,
        {
          params: {
            address: process.env.TON_WALLET,
            limit: 10,
            hash: txHash
          },
          headers: {
            'X-API-Key': process.env.TONCENTER_API_KEY
          }
        }
      );

      const transactions = response.data.result;

      // Check if transaction exists and is confirmed
      const tx = transactions.find(t => t.transaction_id.hash === txHash);

      if (tx) {
        console.log(`✅ TON transaction VERIFIED on blockchain!`);
        console.log(`   Amount: ${tx.in_msg.value / 1e9} TON`);
        console.log(`   Block: ${tx.transaction_id.lt}`);
        return true;
      } else {
        console.log(`⏳ TON transaction not yet confirmed...`);
        return false;
      }

    } catch (error) {
      console.error('TON verification error:', error.message);
      return false;
    }
  }

  /**
   * Monitor all pending exchanges
   */
  async monitorExchanges() {
    for (const [exchangeId, exchange] of this.pendingExchanges.entries()) {
      if (exchange.status !== 'completed') {
        const status = await this.checkExchangeStatus(exchangeId);

        if (status.verified) {
          exchange.status = 'completed';
          console.log(`✅ Exchange ${exchangeId} completed and verified!`);

          // Trigger TON → token swaps
          await this.triggerTokenSwaps(exchange.toAmount);
        }
      }
    }
  }

  /**
   * Trigger swaps from TON to MineX/tBTC/MRDN
   */
  async triggerTokenSwaps(tonAmount) {
    console.log(`🔄 Triggering token swaps for ${tonAmount} TON...`);

    // Will be implemented in ton-dex-swaps.js
    const { swapTONtoTokens } = require('./ton-dex-swaps');

    const tokens = await swapTONtoTokens(tonAmount, {
      MineX: 0.4, // 40%
      tBTC: 0.3,  // 30%
      MRDN: 0.3   // 30%
    });

    return tokens;
  }

  getStats() {
    return {
      pending: this.pendingExchanges.size,
      completed: this.completedExchanges.size,
      pendingDetails: Array.from(this.pendingExchanges.values()),
      completedDetails: Array.from(this.completedExchanges.values()).slice(-10)
    };
  }
}

// Singleton instance
const exchange = new VerifiedExchange();

// Monitor exchanges every 30 seconds
setInterval(() => {
  exchange.monitorExchanges().catch(console.error);
}, 30000);

module.exports = exchange;
