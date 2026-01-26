#!/bin/bash

echo "🚀 Starting FasTap Mining Services..."
echo ""

# Get script directory (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Working directory: $SCRIPT_DIR"
echo ""

# Verify .env exists
if [ ! -f ".env" ]; then
  echo "❌ ERROR: .env file not found!"
  echo "📁 Make sure .env exists in: $SCRIPT_DIR"
  exit 1
fi

# Create logs directory
mkdir -p logs

# Start Bot
echo "📱 Starting Telegram Bot..."
cd "$SCRIPT_DIR"
nohup node bot/main.js > logs/bot.log 2>&1 &
BOT_PID=$!
echo "✅ Bot started (PID: $BOT_PID)"

# Wait a moment to check if bot started successfully
sleep 2
if kill -0 $BOT_PID 2>/dev/null; then
  echo "✅ Bot is running"
else
  echo "❌ Bot failed to start! Check logs/bot.log"
fi

# Start Payment Monitor
echo "💳 Starting Payment Monitor..."
cd "$SCRIPT_DIR"
nohup node workers/payment-monitor-worker.js > logs/payment-monitor.log 2>&1 &
PAYMENT_PID=$!
echo "✅ Payment Monitor started (PID: $PAYMENT_PID)"

# Start Fee Payout Worker
echo "💰 Starting Fee Payout Worker..."
cd "$SCRIPT_DIR"
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
echo ""
echo "💡 Check bot startup:"
echo "  tail -20 logs/bot.log"
