/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns service health status with database connectivity check
 */

const db = require('../database/db');
const logger = require('../utils/logger').loggers.api;

async function healthHandler(req, res) {
  const startTime = Date.now();
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks: {
      database: 'unknown',
      environment: 'unknown'
    }
  };

  try {
    // Check database connection
    const dbStart = Date.now();
    await db.query('SELECT 1 as health_check');
    const dbDuration = Date.now() - dbStart;

    healthStatus.checks.database = {
      status: 'healthy',
      responseTime: `${dbDuration}ms`
    };

    // Check critical environment variables
    const requiredEnvVars = [
      'TOKEN_API_BOT',
      'SUPABASE_URL',
      'SUPABASE_KEY',
      'OWNER_TELEGRAM_IDS',
      'OWNER_WALLET_TON'
    ];

    const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

    if (missingEnvVars.length > 0) {
      healthStatus.checks.environment = {
        status: 'degraded',
        missing: missingEnvVars
      };
      healthStatus.status = 'degraded';
    } else {
      healthStatus.checks.environment = {
        status: 'healthy',
        configured: requiredEnvVars.length
      };
    }

    // Overall response time
    healthStatus.responseTime = `${Date.now() - startTime}ms`;

    // Return 200 for healthy, 503 for degraded
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json(healthStatus);

  } catch (error) {
    logger.error('Health check failed', { error: error.message });

    healthStatus.status = 'unhealthy';
    healthStatus.checks.database = {
      status: 'unhealthy',
      error: error.message
    };
    healthStatus.responseTime = `${Date.now() - startTime}ms`;

    res.status(503).json(healthStatus);
  }
}

module.exports = async (req, res) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return healthHandler(req, res);
};
