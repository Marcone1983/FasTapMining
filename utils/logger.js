/**
 * Production Logger - Structured logging with levels
 * Replaces console.log with proper logging infrastructure
 */

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor(context = 'APP') {
    this.context = context;
    this.level = process.env.LOG_LEVEL || 'INFO';
    this.logLevel = LOG_LEVELS[this.level] || LOG_LEVELS.INFO;
  }

  _shouldLog(level) {
    return LOG_LEVELS[level] <= this.logLevel;
  }

  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta) : '';

    return `[${timestamp}] [${level}] [${this.context}] ${message} ${metaStr}`;
  }

  error(message, error = null) {
    if (!this._shouldLog('ERROR')) return;

    const meta = error ? {
      error: error.message,
      stack: error.stack,
      ...error
    } : {};

    console.error(this._formatMessage('ERROR', message, meta));
  }

  warn(message, meta = {}) {
    if (!this._shouldLog('WARN')) return;
    console.warn(this._formatMessage('WARN', message, meta));
  }

  info(message, meta = {}) {
    if (!this._shouldLog('INFO')) return;
    console.log(this._formatMessage('INFO', message, meta));
  }

  debug(message, meta = {}) {
    if (!this._shouldLog('DEBUG')) return;
    console.log(this._formatMessage('DEBUG', message, meta));
  }

  // Mining-specific methods
  miningEvent(event, data = {}) {
    this.info(`⛏️ ${event}`, data);
  }

  poolEvent(event, data = {}) {
    this.info(`🌐 ${event}`, data);
  }

  userEvent(event, userId, data = {}) {
    this.info(`👤 ${event}`, { userId, ...data });
  }

  transactionEvent(event, txHash, data = {}) {
    this.info(`💰 ${event}`, { txHash, ...data });
  }

  // Performance tracking
  time(label) {
    this._timers = this._timers || {};
    this._timers[label] = Date.now();
  }

  timeEnd(label) {
    this._timers = this._timers || {};
    if (!this._timers[label]) {
      this.warn(`Timer "${label}" does not exist`);
      return;
    }

    const duration = Date.now() - this._timers[label];
    this.debug(`⏱️ ${label}: ${duration}ms`);
    delete this._timers[label];

    return duration;
  }
}

// Create singleton loggers for different contexts
const loggers = {
  app: new Logger('APP'),
  mining: new Logger('MINING'),
  pool: new Logger('POOL'),
  database: new Logger('DATABASE'),
  api: new Logger('API'),
  bot: new Logger('BOT'),
  blockchain: new Logger('BLOCKCHAIN'),
  payment: new Logger('PAYMENT'),
  security: new Logger('SECURITY')
};

// Export main logger and context-specific loggers
module.exports = loggers.app;
module.exports.loggers = loggers;
module.exports.Logger = Logger;
