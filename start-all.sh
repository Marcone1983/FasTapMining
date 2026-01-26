#!/bin/bash

echo "🚀 Starting FasTap Mining Services..."
echo ""

# Create logs directory
mkdir -p logs

# Start Bot
echo "📱 Starting Telegram Bot..."
nohup node bot/main.js > logs/bot.log 2>&1 &
BOT_PID=$!
echo "✅ Bot started (PID: $BOT_PID)"

# Start Payment Monitor
echo "💳 Starting Payment Monitor..."
nohup node workers/payment-monitor-worker.js > logs/payment-monitor.log 2>&1 &
PAYMENT_PID=$!
echo "✅ Payment Monitor started (PID: $PAYMENT_PID)"

# Start Fee Payout Worker
echo "💰 Starting Fee Payout Worker..."
nohup node workers/fee-payout-worker.js > logs/fee-payout.log 2>&1 &
FEE_PID=$!
echo "✅ Fee Payout Worker started (PID: $FEE_PID)"

# Save PIDs
echo $BOT_PID > logs/bot.pid
echo $PAYMENT_PID > logs/payment-monitor.pid
echo $FEE_PID > logs/fee-payout.pid

echo ""
echo "🎉 All services started!"
echo ""
echo "📊 View logs:"
echo "  tail -f logs/bot.log"
echo "  tail -f logs/payment-monitor.log"
echo "  tail -f logs/fee-payout.log"
echo ""
echo "🛑 Stop all:"
echo "  ./stop-all.sh"
