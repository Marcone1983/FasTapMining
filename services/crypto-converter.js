const axios = require('axios');

// ChangeNOW API v2
const CHANGENOW_API = 'https://api.changenow.io/v2';
const API_KEY = process.env.CHANGENOW_API_KEY;

class CryptoConverter {
  constructor() {
    this.apiKey = API_KEY;
    this.platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 5;
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
   * Get estimated exchange amount
   */
  async getEstimatedAmount(fromCurrency, toCurrency, amount) {
    try {
      const response = await axios.get(`${CHANGENOW_API}/exchange/estimated-amount`, {
        params: {
          fromCurrency: fromCurrency.toLowerCase(),
          toCurrency: toCurrency.toLowerCase(),
          fromAmount: amount,
          flow: 'standard',
          type: 'direct'
        },
        headers: {
          'x-changenow-api-key': this.apiKey
        }
      });

      return {
        success: true,
        estimatedAmount: parseFloat(response.data.toAmount),
        fromAmount: parseFloat(amount),
        fromCurrency: fromCurrency,
        toCurrency: toCurrency,
        rate: parseFloat(response.data.toAmount) / parseFloat(amount)
      };
    } catch (error) {
      console.error('ChangeNOW estimation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Create exchange transaction
   */
  async createExchange(fromCurrency, toCurrency, amount, recipientAddress, refundAddress) {
    try {
      const response = await axios.post(
        `${CHANGENOW_API}/exchange`,
        {
          fromCurrency: fromCurrency.toLowerCase(),
          toCurrency: toCurrency.toLowerCase(),
          fromAmount: amount.toString(),
          address: recipientAddress,
          refundAddress: refundAddress || recipientAddress,
          flow: 'standard'
        },
        {
          headers: {
            'x-changenow-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        exchangeId: response.data.id,
        payinAddress: response.data.payinAddress,
        payoutAddress: response.data.payoutAddress,
        fromAmount: parseFloat(response.data.fromAmount),
        toAmount: parseFloat(response.data.toAmount),
        status: response.data.status
      };
    } catch (error) {
      console.error('ChangeNOW exchange creation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get exchange status
   */
  async getExchangeStatus(exchangeId) {
    try {
      const response = await axios.get(`${CHANGENOW_API}/exchange/by-id`, {
        params: { id: exchangeId },
        headers: {
          'x-changenow-api-key': this.apiKey
        }
      });

      return {
        success: true,
        status: response.data.status,
        fromAmount: parseFloat(response.data.fromAmount),
        toAmount: parseFloat(response.data.toAmount),
        payinHash: response.data.payinHash,
        payoutHash: response.data.payoutHash
      };
    } catch (error) {
      console.error('ChangeNOW status check error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Convert mining earnings to TON with fee distribution
   */
  async convertEarningsToTON(earnings) {
    const results = {
      LTC: null,
      DOGE: null,
      totalTON: 0,
      userTON: 0,
      feeTON: 0
    };

    // Convert LTC to TON
    if (earnings.LTC && earnings.LTC > 0) {
      const ltcResult = await this.convertWithFee('LTC', 'TON', earnings.LTC, earnings.userWalletTON);
      results.LTC = ltcResult;
      if (ltcResult.success) {
        results.totalTON += ltcResult.totalReceived;
        results.userTON += ltcResult.userAmount;
        results.feeTON += ltcResult.feeAmount;
      }
    }

    // Convert DOGE to TON
    if (earnings.DOGE && earnings.DOGE > 0) {
      const dogeResult = await this.convertWithFee('DOGE', 'TON', earnings.DOGE, earnings.userWalletTON);
      results.DOGE = dogeResult;
      if (dogeResult.success) {
        results.totalTON += dogeResult.totalReceived;
        results.userTON += dogeResult.userAmount;
        results.feeTON += dogeResult.feeAmount;
      }
    }

    return results;
  }

  /**
   * Convert with automatic fee deduction
   */
  async convertWithFee(fromCurrency, toCurrency, amount, userWallet) {
    // Get estimation first
    const estimation = await this.getEstimatedAmount(fromCurrency, toCurrency, amount);

    if (!estimation.success) {
      return {
        success: false,
        error: estimation.error
      };
    }

    const totalReceived = estimation.estimatedAmount;
    const feeAmount = totalReceived * (this.platformFeePercent / 100);
    const userAmount = totalReceived - feeAmount;

    // Create exchange for user (95%)
    const userExchange = await this.createExchange(
      fromCurrency,
      toCurrency,
      amount * 0.95, // 95% to user
      userWallet,
      userWallet
    );

    // Create exchange for owner (5%)
    const feeExchange = await this.createExchange(
      fromCurrency,
      toCurrency,
      amount * 0.05, // 5% to owner
      this.ownerWallets.TON,
      this.ownerWallets.TON
    );

    return {
      success: userExchange.success && feeExchange.success,
      fromCurrency,
      toCurrency,
      fromAmount: amount,
      totalReceived,
      userAmount,
      feeAmount,
      userExchange: userExchange.success ? {
        exchangeId: userExchange.exchangeId,
        payinAddress: userExchange.payinAddress,
        status: userExchange.status
      } : null,
      feeExchange: feeExchange.success ? {
        exchangeId: feeExchange.exchangeId,
        payinAddress: feeExchange.payinAddress,
        status: feeExchange.status
      } : null,
      error: !userExchange.success ? userExchange.error : (!feeExchange.success ? feeExchange.error : null)
    };
  }

  /**
   * Distribute 6 small tokens with 5% fee
   */
  distributeSmallTokens(earnings, userWallets) {
    const distributions = {};
    const tokens = ['BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];

    tokens.forEach(token => {
      if (earnings[token] && earnings[token] > 0) {
        const totalAmount = earnings[token];
        const feeAmount = totalAmount * 0.05; // 5%
        const userAmount = totalAmount * 0.95; // 95%

        distributions[token] = {
          total: totalAmount,
          userAmount: userAmount,
          userWallet: userWallets[token] || null,
          feeAmount: feeAmount,
          feeWallet: this.ownerWallets[token],
          canDistribute: !!userWallets[token] // Only if user provided wallet
        };
      }
    });

    return distributions;
  }

  /**
   * Get minimum conversion amounts
   */
  async getMinimumAmounts() {
    const currencies = ['ltc', 'doge'];
    const minimums = {};

    for (const currency of currencies) {
      try {
        const response = await axios.get(`${CHANGENOW_API}/exchange/min-amount/${currency}_ton`, {
          headers: {
            'x-changenow-api-key': this.apiKey
          }
        });

        minimums[currency.toUpperCase()] = parseFloat(response.data.minAmount);
      } catch (error) {
        console.error(`Failed to get minimum for ${currency}:`, error.message);
        minimums[currency.toUpperCase()] = 0.001; // Default fallback
      }
    }

    return minimums;
  }
}

module.exports = new CryptoConverter();
