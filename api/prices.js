// API endpoint for cryptocurrency prices
const axios = require('axios');
const logger = require('../utils/logger').loggers.api;

// Cache prices for 60 seconds to avoid hitting rate limits
let priceCache = {
  data: null,
  timestamp: 0,
  ttl: 60000 // 60 seconds
};

module.exports = async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (priceCache.data && (now - priceCache.timestamp) < priceCache.ttl) {
      return res.status(200).json({
        success: true,
        ...priceCache.data,
        cached: true
      });
    }

    // Fetch fresh prices from CoinGecko API
    const coinIds = {
      LTC: 'litecoin',
      DOGE: 'dogecoin',
      TON: 'the-open-network',
      BELLS: 'bellscoin',
      LKY: 'luckycoin',
      PEP: 'pepecoin',
      JKC: 'junkcoin',
      DINGO: 'dingocoin'
    };

    const idsString = Object.values(coinIds).join(',');

    const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
      params: {
        ids: idsString,
        vs_currencies: 'usd',
        include_24hr_change: 'true'
      },
      timeout: 5000
    });

    const prices = {};
    const changes24h = {};

    // Map CoinGecko IDs back to our symbols
    Object.entries(coinIds).forEach(([symbol, id]) => {
      if (response.data[id]) {
        prices[symbol] = response.data[id].usd || 0;
        changes24h[symbol] = response.data[id].usd_24h_change || 0;
      } else {
        // Fallback prices if API doesn't return data
        prices[symbol] = 0;
        changes24h[symbol] = 0;
      }
    });

    const result = {
      prices,
      changes24h,
      timestamp: now
    };

    // Update cache
    priceCache = {
      data: result,
      timestamp: now,
      ttl: priceCache.ttl
    };

    res.status(200).json({
      success: true,
      ...result,
      cached: false
    });

  } catch (error) {
    logger.error('Error fetching prices:', error.message);

    // Return cached data even if expired in case of API error
    if (priceCache.data) {
      return res.status(200).json({
        success: true,
        ...priceCache.data,
        cached: true,
        stale: true
      });
    }

    // Fallback to zero prices if no cache available
    res.status(200).json({
      success: true,
      prices: {
        LTC: 0,
        DOGE: 0,
        TON: 0,
        BELLS: 0,
        LKY: 0,
        PEP: 0,
        JKC: 0,
        DINGO: 0
      },
      changes24h: {},
      error: 'Unable to fetch prices',
      cached: false
    });
  }
};
