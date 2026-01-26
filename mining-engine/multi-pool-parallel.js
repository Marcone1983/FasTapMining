const crypto = require('crypto');
const WebSocket = require('ws');
const axios = require('axios');
const { Worker } = require('worker_threads');
const db = require('../database/db');

// 🔥 MULTI-POOL PARALLEL MINING ENGINE
// Distributes user taps across ALL active TON pools simultaneously

const ACTIVE_POOLS = {
  toncoinpool: {
    id: 'toncoinpool',
    name: 'TonCoinPool',
    type: 'stratum_wss',
    url: 'wss://pplns.toncoinpool.io/stratum',
    enabled: true,
    weight: 0.33, // 33% of taps
    status: 'offline',
    shares: 0,
    hashrate: 0
  },
  infinityton: {
    id: 'infinityton',
    name: 'InfinityTON (TonWhales)',
    type: 'stratum_tcp',
    url: 'stratum+tcp://ethash.infinityton.com:4444',
    enabled: true,
    weight: 0.33, // 33% of taps
    status: 'offline',
    shares: 0,
    hashrate: 0
  },
  tonuniverse: {
    id: 'tonuniverse',
    name: 'TonUniverse',
    type: 'http_api',
    url: 'https://pool.tonuniverse.com',
    enabled: true,
    weight: 0.34, // 34% of taps
    status: 'offline',
    shares: 0,
    hashrate: 0
  }
};

class MultiPoolParallelMiner {
  constructor() {
    this.pools = ACTIVE_POOLS;
    this.connections = {};
    this.userTaps = new Map(); // userId -> total taps
    this.poolStats = new Map(); // poolId -> stats
    this.totalShares = 0;
    this.globalHashrate = 0;
  }

  // Initialize connections to ALL pools
  async initializeAllPools() {
    console.log('🚀 Initializing PARALLEL connections to ALL pools...');

    const initPromises = Object.values(this.pools).map(async (pool) => {
      if (!pool.enabled) return;

      try {
        await this.connectToPool(pool);
        console.log(`✅ Connected to ${pool.name}`);
      } catch (error) {
        console.error(`❌ Failed to connect to ${pool.name}:`, error.message);
        pool.status = 'error';
      }
    });

    await Promise.allSettled(initPromises);
  }

  // Connect to specific pool based on type
  async connectToPool(pool) {
    switch (pool.type) {
      case 'stratum_wss':
        return this.connectStratumWSS(pool);
      case 'stratum_tcp':
        return this.connectStratumTCP(pool);
      case 'http_api':
        return this.connectHTTPAPI(pool);
      default:
        throw new Error(`Unknown pool type: ${pool.type}`);
    }
  }

  // TonCoinPool - WebSocket Stratum
  async connectStratumWSS(pool) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(pool.url);

      ws.on('open', () => {
        console.log(`🔗 WebSocket connected to ${pool.name}`);

        // Stratum subscribe
        const subscribeMsg = {
          id: 1,
          jsonrpc: '2.0',
          method: 'mining.subscribe',
          params: ['FasTapMining/1.0']
        };

        ws.send(JSON.stringify(subscribeMsg));
        pool.status = 'connected';
        this.connections[pool.id] = ws;
        resolve(ws);
      });

      ws.on('message', (data) => {
        this.handleStratumMessage(pool, data);
      });

      ws.on('error', (error) => {
        console.error(`❌ ${pool.name} WebSocket error:`, error);
        pool.status = 'error';
        reject(error);
      });

      ws.on('close', () => {
        console.log(`🔌 ${pool.name} disconnected, reconnecting...`);
        pool.status = 'reconnecting';
        setTimeout(() => this.connectStratumWSS(pool), 5000);
      });
    });
  }

  // InfinityTON - TCP Stratum
  async connectStratumTCP(pool) {
    const net = require('net');
    return new Promise((resolve, reject) => {
      // Parse URL: stratum+tcp://host:port
      const match = pool.url.match(/stratum\+tcp:\/\/([^:]+):(\d+)/);
      if (!match) {
        reject(new Error(`Invalid stratum TCP URL: ${pool.url}`));
        return;
      }

      const [, host, port] = match;
      const client = new net.Socket();

      client.connect(parseInt(port), host, () => {
        console.log(`🔗 TCP connected to ${pool.name} (${host}:${port})`);

        // Stratum subscribe
        const subscribeMsg = {
          id: 1,
          jsonrpc: '2.0',
          method: 'mining.subscribe',
          params: ['FasTapMining/1.0']
        };

        client.write(JSON.stringify(subscribeMsg) + '\n');
        pool.status = 'connected';
        this.connections[pool.id] = client;
        resolve(client);
      });

      client.on('data', (data) => {
        this.handleStratumMessage(pool, data);
      });

      client.on('error', (error) => {
        console.error(`❌ ${pool.name} TCP error:`, error);
        pool.status = 'error';
        reject(error);
      });

      client.on('close', () => {
        console.log(`🔌 ${pool.name} disconnected, reconnecting...`);
        pool.status = 'reconnecting';
        setTimeout(() => this.connectStratumTCP(pool), 5000);
      });
    });
  }

  // TonUniverse - HTTP API
  async connectHTTPAPI(pool) {
    try {
      // Test API connection
      const response = await axios.get(`${pool.url}/api/v1/info`, {
        timeout: 5000
      });

      if (response.status === 200) {
        console.log(`🔗 HTTP API connected to ${pool.name}`);
        pool.status = 'connected';
        this.connections[pool.id] = { type: 'http', url: pool.url };
        return true;
      }
    } catch (error) {
      console.error(`❌ ${pool.name} HTTP API error:`, error.message);
      pool.status = 'error';
      throw error;
    }
  }

  // Handle Stratum protocol messages
  handleStratumMessage(pool, data) {
    const lines = data.toString().split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const message = JSON.parse(line);

        // Job notification
        if (message.method === 'mining.notify' || (message.result && message.result.job)) {
          const job = message.params || message.result.job;
          console.log(`⛏️ New job from ${pool.name}: ${job.job_id || job[0]}`);

          // Mine this job with current hashrate
          this.mineJob(pool, job);
        }

        // Share accepted
        if (message.result && message.result.status === 'OK') {
          console.log(`✅ Share ACCEPTED by ${pool.name}!`);
          pool.shares++;
          this.totalShares++;
          this.onShareAccepted(pool);
        }

        // Share rejected
        if (message.error) {
          console.log(`❌ Share REJECTED by ${pool.name}:`, message.error);
        }
      } catch (error) {
        // Ignore parse errors
      }
    }
  }

  // Mine job with accumulated hashrate
  async mineJob(pool, job) {
    const hashrate = this.getPoolHashrate(pool);
    if (hashrate === 0) return;

    // Simulate mining work
    const iterations = Math.floor(hashrate * 100); // Adjust multiplier

    for (let nonce = 0; nonce < iterations; nonce++) {
      // Generate hash
      const hash = crypto.createHash('sha256')
        .update(`${job.job_id || job[0]}_${nonce}_${Date.now()}`)
        .digest('hex');

      // Check if valid (simplified)
      if (hash.startsWith('0000')) {
        // Valid share found!
        this.submitShare(pool, job, nonce, hash);
        break;
      }
    }

    pool.hashrate = hashrate;
  }

  // Submit share to pool
  submitShare(pool, job, nonce, hash) {
    const connection = this.connections[pool.id];
    if (!connection) return;

    const submitMsg = {
      id: Date.now(),
      jsonrpc: '2.0',
      method: 'mining.submit',
      params: {
        id: process.env.TON_WALLET || 'YOUR_WALLET',
        job_id: job.job_id || job[0],
        nonce: nonce.toString(16),
        result: hash
      }
    };

    if (pool.type === 'stratum_wss') {
      connection.send(JSON.stringify(submitMsg));
    } else if (pool.type === 'stratum_tcp') {
      connection.write(JSON.stringify(submitMsg) + '\n');
    } else if (pool.type === 'http_api') {
      // HTTP POST for share submission
      axios.post(`${connection.url}/api/v1/submit`, submitMsg)
        .catch(err => console.error(`HTTP submit error:`, err.message));
    }

    console.log(`📤 Submitted share to ${pool.name}`);
  }

  // When share is accepted by pool
  async onShareAccepted(pool) {
    // Estimate reward (pool-specific)
    const estimatedReward = this.estimateReward(pool);

    console.log(`💰 Estimated reward from ${pool.name}: ${estimatedReward} TON`);

    // Distribute to users proportionally
    await this.distributeRewards(pool, estimatedReward);
  }

  estimateReward(pool) {
    // Rough estimates based on pool type
    switch (pool.id) {
      case 'toncoinpool':
        return 0.00001; // ~0.00001 TON per share
      case 'infinityton':
        return 0.00002; // ETH→TON conversion
      case 'tonuniverse':
        return 0.000015;
      default:
        return 0.00001;
    }
  }

  // Distribute rewards to users
  async distributeRewards(pool, totalReward) {
    const poolTaps = this.getPoolTaps(pool);
    if (poolTaps === 0) return;

    for (const [userId, userTaps] of this.userTaps.entries()) {
      const userPoolTaps = Math.floor(userTaps * pool.weight);
      const userShare = userPoolTaps / poolTaps;
      const userReward = totalReward * userShare;

      if (userReward > 0) {
        await this.creditUser(userId, userReward, pool);
      }
    }
  }

  async creditUser(userId, amount, pool) {
    try {
      const user = await db.User.findByTelegramId(userId);
      if (!user) return;

      // Convert TON to MineX/tBTC/MRDN via DEX (simplified)
      const rewards = {
        MineX: amount * 40000 * 0.4,   // 40% to MineX
        tBTC: amount * 200 * 0.3,      // 30% to tBTC
        MRDN: amount * 5000 * 0.3      // 30% to MRDN
      };

      await db.transaction(async (client) => {
        for (const [token, tokenAmount] of Object.entries(rewards)) {
          await db.User.updateBalance(user.id, token, tokenAmount, 'add');
        }

        await client.query(
          `INSERT INTO mining_rewards (user_id, source, pool_name, rewards, mined_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [user.id, 'parallel_mining', pool.name, rewards]
        );
      });

      console.log(`✅ Credited ${userId} from ${pool.name}:`, rewards);
    } catch (error) {
      console.error(`❌ Credit error:`, error);
    }
  }

  // ADD USER TAPS - DISTRIBUTED ACROSS ALL POOLS
  async addUserTaps(userId, taps) {
    const current = this.userTaps.get(userId) || 0;
    this.userTaps.set(userId, current + taps);

    console.log(`👤 User ${userId}: +${taps} taps (total: ${current + taps})`);

    // DISTRIBUTE taps across ALL active pools
    for (const pool of Object.values(this.pools)) {
      if (!pool.enabled || pool.status !== 'connected') continue;

      const poolTaps = Math.floor(taps * pool.weight);
      console.log(`   → ${pool.name}: ${poolTaps} taps (${(pool.weight * 100).toFixed(0)}%)`);

      // Update pool stats
      if (!this.poolStats.has(pool.id)) {
        this.poolStats.set(pool.id, { taps: 0, users: new Set() });
      }

      const stats = this.poolStats.get(pool.id);
      stats.taps += poolTaps;
      stats.users.add(userId);
    }

    // Recalculate global hashrate
    this.updateGlobalHashrate();

    // Log to database
    await db.Mining.addShares(
      userId,
      'parallel_mining',
      taps,
      Object.values(this.pools).filter(p => p.enabled && p.status === 'connected').length,
      this.globalHashrate
    );
  }

  // Calculate hashrate for specific pool
  getPoolHashrate(pool) {
    const stats = this.poolStats.get(pool.id);
    if (!stats) return 0;

    // 1000 taps = 1 H/s
    return stats.taps / 1000;
  }

  // Calculate total taps for specific pool
  getPoolTaps(pool) {
    const stats = this.poolStats.get(pool.id);
    return stats ? stats.taps : 0;
  }

  // Update global hashrate from all pools
  updateGlobalHashrate() {
    let total = 0;
    for (const pool of Object.values(this.pools)) {
      if (pool.enabled && pool.status === 'connected') {
        total += this.getPoolHashrate(pool);
      }
    }
    this.globalHashrate = total;
  }

  // Get comprehensive stats
  getStats() {
    const poolsStats = {};
    for (const [poolId, pool] of Object.entries(this.pools)) {
      const stats = this.poolStats.get(poolId) || { taps: 0, users: new Set() };
      poolsStats[poolId] = {
        name: pool.name,
        status: pool.status,
        hashrate: this.getPoolHashrate(pool).toFixed(2) + ' H/s',
        shares: pool.shares,
        taps: stats.taps,
        activeMiners: stats.users.size,
        weight: (pool.weight * 100).toFixed(0) + '%'
      };
    }

    return {
      globalHashrate: this.globalHashrate.toFixed(2) + ' H/s',
      totalShares: this.totalShares,
      activePools: Object.values(this.pools).filter(p => p.status === 'connected').length,
      totalActivePools: Object.values(this.pools).filter(p => p.enabled).length,
      totalMiners: this.userTaps.size,
      totalTaps: Array.from(this.userTaps.values()).reduce((a, b) => a + b, 0),
      pools: poolsStats
    };
  }
}

// Singleton instance
const multiPoolMiner = new MultiPoolParallelMiner();

// Initialize on startup
multiPoolMiner.initializeAllPools().catch(console.error);

module.exports = multiPoolMiner;
