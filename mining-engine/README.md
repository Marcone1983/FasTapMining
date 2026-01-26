# ⛏️ Real Mining Engine - ViaBTC Scrypt Pool

**REAL mining on ViaBTC pool with 8-coin merge mining!**

## 🎯 How It Works

User taps in Telegram → REAL hashrate contribution → Earnings from actual pool

```
USER TAPS (Telegram App)
        ↓
Converted to hashrate (0.1 H/s per tap)
        ↓
Submitted to ltc.viabtc.io:3333 (Stratum)
        ↓
REAL MINING on ViaBTC pool
        ↓
Rewards distributed from pool:
  - LTC (Litecoin)
  - DOGE (Dogecoin)
  - BELLS (Bellscoin)
  - LKY (Luckycoin)
  - PEP (Pepecoin)
  - JKC (Junkcoin)
  - DINGO (Dingocoin)
  - SHIC (Shicoin)
        ↓
Earnings saved to database per user
```

## 📦 Files

- **viabtc-scrypt-miner.js** - Main mining engine
  - Connects to ViaBTC Stratum pool
  - Manages user hashrate contributions
  - Distributes real earnings to users

## 🔗 Pool Details

```javascript
Pool: ViaBTC Litecoin Merge Mining
Host: ltc.viabtc.io
Port: 3333 (main), 25 (fallback), 443 (SSL fallback)
Algorithm: Scrypt
Fee: Low (PPS+ mode)
Coins: 8 simultaneous (LTC + DOGE + BELLS + LKY + PEP + JKC + DINGO + SHIC)
```

## 🚀 Usage

The miner is automatically initialized when the server starts:

```javascript
const viaBTCMiner = require('./mining-engine/viabtc-scrypt-miner');

// Auto-connects to pool on first require
viaBTCMiner.initialize();

// Add user taps to hashrate pool
viaBTCMiner.addUserTaps(userId, taps);

// Get current stats
const stats = viaBTCMiner.getStats();
```

## 📊 Stats Response

```javascript
{
  pool: 'ViaBTC Scrypt Merge Mining',
  host: 'ltc.viabtc.io:3333',
  algorithm: 'scrypt',
  coins: ['LTC', 'DOGE', 'BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'],
  connected: true,
  hashrate: '125.40',
  activeUsers: 42,
  difficulty: 16384,
  sharesSubmitted: 1523,
  sharesAccepted: 1485,
  sharesRejected: 38,
  acceptRate: '97.50%',
  earnings: {
    LTC: 0.0012,
    DOGE: 15.30,
    BELLS: 8.50,
    ...
  }
}
```

## ⚡ Hashrate Calculation

```
User taps: 100
Hashrate per tap: 0.1 H/s
Total hashrate: 100 * 0.1 = 10 H/s
```

## 💰 Reward Distribution

When ViaBTC pool accepts a share, rewards are distributed to all active users proportionally:

```
Total pool hashrate: 1000 H/s
User A hashrate: 100 H/s (10%)
User B hashrate: 300 H/s (30%)
User C hashrate: 600 H/s (60%)

Share reward: 0.001 LTC

User A gets: 0.0001 LTC (10%)
User B gets: 0.0003 LTC (30%)
User C gets: 0.0006 LTC (60%)
```

## 🔧 Configuration

Set worker name via environment variable:

```bash
VIABTC_WORKER=FasTapMining_Worker1
```

## ⚠️ Important Notes

- Rewards are REAL and come from ViaBTC pool
- NOT simulated or gamified
- Users receive actual cryptocurrency based on their contributions
- Wallet addresses must be valid TON addresses to receive payouts
