const { rateLimit } = require('../middleware/security');
const logger = require('../utils/logger').loggers.api;

// Rate limiting: 100 webhooks per minute
const webhookRateLimit = rateLimit({
  windowMs: 60000,
  max: 100,
  keyGenerator: (req) => req.ip
});

async function webhookHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transaction } = req.body;

  // Log webhook received
  logger.info('Webhook received:', { transaction });

  res.json({ status: 'processed' });
}

// Export with rate limiting
module.exports = async (req, res) => {
  return webhookRateLimit(req, res, () => {
    return webhookHandler(req, res);
  });
};
