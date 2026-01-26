#!/bin/bash

echo "🛑 Stopping FasTap Mining Services..."
echo ""

# Stop Bot
if [ -f logs/bot.pid ]; then
  BOT_PID=$(cat logs/bot.pid)
  if kill -0 $BOT_PID 2>/dev/null; then
    kill $BOT_PID
    echo "✅ Bot stopped (PID: $BOT_PID)"
  else
    echo "⚠️  Bot not running"
  fi
  rm logs/bot.pid
fi

# Stop Payment Monitor
if [ -f logs/payment-monitor.pid ]; then
  PAYMENT_PID=$(cat logs/payment-monitor.pid)
  if kill -0 $PAYMENT_PID 2>/dev/null; then
    kill $PAYMENT_PID
    echo "✅ Payment Monitor stopped (PID: $PAYMENT_PID)"
  else
    echo "⚠️  Payment Monitor not running"
  fi
  rm logs/payment-monitor.pid
fi

# Stop Fee Payout Worker
if [ -f logs/fee-payout.pid ]; then
  FEE_PID=$(cat logs/fee-payout.pid)
  if kill -0 $FEE_PID 2>/dev/null; then
    kill $FEE_PID
    echo "✅ Fee Payout Worker stopped (PID: $FEE_PID)"
  else
    echo "⚠️  Fee Payout Worker not running"
  fi
  rm logs/fee-payout.pid
fi

echo ""
echo "✅ All services stopped!"
