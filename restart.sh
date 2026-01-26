#!/bin/bash
cd /data/data/com.termux/files/home/FasTapMining

# Kill old processes
pkill -f "bot/main.js" || true
pkill -f "payment-monitor" || true
pkill -f "fee-payout" || true

sleep 2

# Start bot
node bot/main.js >> logs/bot.log 2>&1 &
echo "Bot started (PID: $!)"

# Start payment monitor
node workers/payment-monitor-worker.js >> logs/payment-monitor.log 2>&1 &
echo "Payment Monitor started (PID: $!)"

# Start fee payout
node workers/fee-payout-worker.js >> logs/fee-payout.log 2>&1 &
echo "Fee Payout started (PID: $!)"

sleep 2
echo ""
echo "✅ All services restarted!"
echo ""
tail -10 logs/bot.log
