const lifetimeAccessService = require('../services/lifetime-access-service');
const marketplaceService = require('../services/marketplace-service');

/**
 * Payment Monitor Worker
 * Automatically checks for pending payments on TON blockchain
 * - Lifetime access payments
 * - Marketplace purchases
 */
class PaymentMonitorWorker {
  constructor() {
    this.checkIntervalMs = 30 * 1000; // Check every 30 seconds
    this.expireIntervalMs = 5 * 60 * 1000; // Expire old payments every 5 minutes
    this.isRunning = false;
  }

  start() {
    console.log('🔄 Starting payment monitor worker...');
    console.log(`⏰ Payment check interval: ${this.checkIntervalMs / 1000}s`);
    console.log(`⏰ Expiration check interval: ${this.expireIntervalMs / 1000}s`);

    // Monitor pending payments
    this.monitorInterval = setInterval(() => {
      this.checkPendingPayments();
    }, this.checkIntervalMs);

    // Expire old payments
    this.expireInterval = setInterval(() => {
      this.expireOldPayments();
    }, this.expireIntervalMs);

    // Run immediately on startup
    this.checkPendingPayments();
    this.expireOldPayments();

    console.log('✅ Payment monitor worker started successfully');
  }

  async checkPendingPayments() {
    if (this.isRunning) return;

    this.isRunning = true;

    try {
      await lifetimeAccessService.monitorPendingPayments();
      await marketplaceService.monitorPendingPurchases();
    } catch (error) {
      console.error('❌ Payment monitoring error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async expireOldPayments() {
    try {
      await lifetimeAccessService.expireOldPayments();
      await marketplaceService.expireOldPurchases();
    } catch (error) {
      console.error('❌ Payment expiration error:', error);
    }
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    if (this.expireInterval) {
      clearInterval(this.expireInterval);
    }
    console.log('🛑 Payment monitor worker stopped');
  }

  getStatus() {
    return {
      running: this.isRunning,
      checkInterval: this.checkIntervalMs,
      expireInterval: this.expireIntervalMs
    };
  }
}

// Create singleton instance
const worker = new PaymentMonitorWorker();

// Auto-start if running as main module
if (require.main === module) {
  worker.start();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down worker...');
    worker.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down worker...');
    worker.stop();
    process.exit(0);
  });
}

module.exports = worker;
