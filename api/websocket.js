// WebSocket Server for Real-Time Stats
const logger = require("../utils/logger").loggers.api;
const WebSocket = require('ws');
const db = require('../database/db');

let wss;
const clients = new Set();

function initWebSocket(server) {
  wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    logger.info('✅ WebSocket client connected');
    clients.add(ws);

    // Send initial stats
    sendStats(ws);

    ws.on('close', () => {
      logger.info('❌ WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Broadcast stats every 2 seconds
  setInterval(async () => {
    await broadcastStats();
  }, 2000);

  logger.info('✅ WebSocket server initialized');
  return wss;
}

async function sendStats(ws) {
  try {
    const stats = await getRealtimeStats();
    ws.send(JSON.stringify({
      type: 'stats_update',
      data: stats
    }));
  } catch (error) {
    logger.error('Send stats error:', error);
  }
}

async function broadcastStats() {
  if (clients.size === 0) return;

  try {
    const stats = await getRealtimeStats();
    const message = JSON.stringify({
      type: 'stats_update',
      data: stats
    });

    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  } catch (error) {
    logger.error('Broadcast stats error:', error);
  }
}

async function getRealtimeStats() {
  try {
    // Get active miners (last 5 minutes)
    const { rows: activeMiners } = await db.query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM mining_shares
      WHERE created_at > NOW() - INTERVAL '5 minutes'
    `);

    // Get current hashrate (last minute)
    const { rows: hashrateData } = await db.query(`
      SELECT COALESCE(SUM(hashrate), 0) as total_hashrate
      FROM mining_shares
      WHERE created_at > NOW() - INTERVAL '1 minute'
    `);

    // Get blocks found today
    const { rows: blocksData } = await db.query(`
      SELECT COUNT(*) as count
      FROM blocks
      WHERE found_at > CURRENT_DATE
    `);

    // Get per-pool active miners
    const { rows: poolMiners } = await db.query(`
      SELECT
        pool_id,
        COUNT(DISTINCT user_id) as miners,
        COALESCE(SUM(hashrate), 0) as hashrate
      FROM mining_shares
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      GROUP BY pool_id
    `);

    // Get recent blocks (last 10)
    const { rows: recentBlocks } = await db.query(`
      SELECT
        b.height,
        b.pool_id,
        p.name as pool_name,
        p.token,
        b.reward_amount,
        b.nft_rewarded,
        u.username,
        u.telegram_id,
        b.found_at
      FROM blocks b
      JOIN mining_pools p ON b.pool_id = p.id
      LEFT JOIN users u ON b.finder_user_id = u.id
      ORDER BY b.found_at DESC
      LIMIT 10
    `);

    const poolStats = {};
    poolMiners.forEach(pm => {
      poolStats[pm.pool_id] = {
        activeMiners: parseInt(pm.miners),
        hashrate: parseFloat(pm.hashrate).toFixed(2)
      };
    });

    return {
      activeMiners: parseInt(activeMiners[0].count),
      globalHashrate: parseFloat(hashrateData[0].total_hashrate).toFixed(2),
      blocksFoundToday: parseInt(blocksData[0].count),
      poolStats: poolStats,
      recentBlocks: recentBlocks.map(b => ({
        height: b.height,
        pool: b.pool_name,
        token: b.token,
        reward: parseFloat(b.reward_amount),
        nft: b.nft_rewarded,
        finder: b.username || `User ${b.telegram_id}`,
        timestamp: b.found_at
      })),
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error('Get realtime stats error:', error);
    return {
      activeMiners: 0,
      globalHashrate: '0.00',
      blocksFoundToday: 0,
      poolStats: {},
      recentBlocks: [],
      timestamp: Date.now()
    };
  }
}

function broadcastBlockFound(blockData) {
  const message = JSON.stringify({
    type: 'block_found',
    data: blockData
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function broadcastUserUpdate(userId, updateData) {
  const message = JSON.stringify({
    type: 'user_update',
    userId: userId,
    data: updateData
  });

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

module.exports = {
  initWebSocket,
  broadcastStats,
  broadcastBlockFound,
  broadcastUserUpdate,
  getRealtimeStats
};
