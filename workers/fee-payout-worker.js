const feePayoutService = require('../services/fee-payout-service');

/**
 * Automated Fee Payout Worker
 * Runs every 24 hours to process accumulated platform fees
 */
class FeePayoutWorker {
  constructor() {
    this.intervalMs = 24 * 60 * 60 * 1000; // 24 hours
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  start() {
    console.log('🔄 Starting automated fee payout worker...');
    console.log(`⏰ Payout interval: Every 24 hours`);

    // Run immediately on startup
    this.runPayout();

    // Schedule recurring payouts
    this.interval = setInterval(() => {
      this.runPayout();
    }, this.intervalMs);

    console.log('✅ Fee payout worker started successfully');
  }

  async runPayout() {
    if (this.isRunning) {
      console.log('⏳ Payout already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRun = new Date();

    try {
      console.log('\n' + '='.repeat(80));
      console.log('🏦 AUTOMATED FEE PAYOUT - STARTED');
      console.log(`⏰ Time: ${this.lastRun.toISOString()}`);
      console.log('='.repeat(80) + '\n');

      // Get current stats before payout
      const statsBefore = await feePayoutService.getPayoutStats();
      console.log('📊 Pending fees before payout:');
      for (const [coin, amount] of Object.entries(statsBefore.pending)) {
        if (amount > 0) {
          console.log(`   ${coin}: ${amount}`);
        }
      }

      // Process payouts
      const results = await feePayoutService.processAllPayouts();

      // Display results
      console.log('\n📋 PAYOUT RESULTS:');
      if (results.LTC?.success) {
        console.log(`   ✅ LTC: ${results.LTC.amount} → ${results.LTC.tonReceived} TON (Exchange: ${results.LTC.exchangeId})`);
      }
      if (results.DOGE?.success) {
        console.log(`   ✅ DOGE: ${results.DOGE.amount} → ${results.DOGE.tonReceived} TON (Exchange: ${results.DOGE.exchangeId})`);
      }

      const smallTokens = ['BELLS', 'LKY', 'PEP', 'JKC', 'DINGO', 'SHIC'];
      for (const token of smallTokens) {
        if (results[token]?.success) {
          console.log(`   ✅ ${token}: ${results[token].amount} marked for withdrawal`);
        }
      }

      if (results.errors.length > 0) {
        console.log('\n⚠️  ERRORS:');
        results.errors.forEach(err => {
          console.log(`   ❌ ${err.coin}: ${err.error}`);
        });
      }

      console.log(`\n💰 Total TON received from conversions: ${results.totalTONReceived.toFixed(4)} TON`);

      console.log('\n' + '='.repeat(80));
      console.log('✅ AUTOMATED FEE PAYOUT - COMPLETED');
      console.log('='.repeat(80) + '\n');

    } catch (error) {
      console.error('\n❌ AUTOMATED FEE PAYOUT - FAILED');
      console.error('Error:', error);
    } finally {
      this.isRunning = false;
      this.nextRun = new Date(Date.now() + this.intervalMs);
      console.log(`⏰ Next payout scheduled for: ${this.nextRun.toISOString()}\n`);
    }
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('🛑 Fee payout worker stopped');
    }
  }

  getStatus() {
    return {
      running: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      intervalHours: this.intervalMs / (60 * 60 * 1000)
    };
  }
}

// Create singleton instance
const worker = new FeePayoutWorker();

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
