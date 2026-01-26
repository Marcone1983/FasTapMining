module.exports = {
  apps: [
    {
      name: 'telegram-bot',
      script: './bot/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/bot-error.log',
      out_file: './logs/bot-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'payment-monitor',
      script: './workers/payment-monitor-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/payment-monitor-error.log',
      out_file: './logs/payment-monitor-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      cron_restart: '0 */6 * * *' // Restart every 6 hours
    },
    {
      name: 'fee-payout',
      script: './workers/fee-payout-worker.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/fee-payout-error.log',
      out_file: './logs/fee-payout-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      cron_restart: '0 0 * * *' // Restart daily at midnight
    },
    {
      name: 'mining-engine',
      script: './mining-engine/viabtc-scrypt-miner.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/mining-error.log',
      out_file: './logs/mining-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
