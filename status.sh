#!/bin/bash

echo "📊 FasTap Mining - Service Status"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check Bot
if [ -f logs/bot.pid ]; then
  BOT_PID=$(cat logs/bot.pid)
  if kill -0 $BOT_PID 2>/dev/null; then
    echo "✅ Telegram Bot: RUNNING (PID: $BOT_PID)"
  else
    echo "❌ Telegram Bot: STOPPED"
  fi
else
  echo "❌ Telegram Bot: NOT STARTED"
fi

# Check Payment Monitor
if [ -f logs/payment-monitor.pid ]; then
  PAYMENT_PID=$(cat logs/payment-monitor.pid)
  if kill -0 $PAYMENT_PID 2>/dev/null; then
    echo "✅ Payment Monitor: RUNNING (PID: $PAYMENT_PID)"
  else
    echo "❌ Payment Monitor: STOPPED"
  fi
else
  echo "❌ Payment Monitor: NOT STARTED"
fi

# Check Fee Payout Worker
if [ -f logs/fee-payout.pid ]; then
  FEE_PID=$(cat logs/fee-payout.pid)
  if kill -0 $FEE_PID 2>/dev/null; then
    echo "✅ Fee Payout Worker: RUNNING (PID: $FEE_PID)"
  else
    echo "❌ Fee Payout Worker: STOPPED"
  fi
else
  echo "❌ Fee Payout Worker: NOT STARTED"
fi

echo ""
echo "📋 Recent Logs:"
echo "═══════════════════════════════════════════════════════"
echo ""

if [ -f logs/bot.log ]; then
  echo "🤖 Bot (last 5 lines):"
  tail -5 logs/bot.log
  echo ""
fi

if [ -f logs/payment-monitor.log ]; then
  echo "💳 Payment Monitor (last 5 lines):"
  tail -5 logs/payment-monitor.log
  echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo ""
echo "💡 Commands:"
echo "  ./start-all.sh   - Start all services"
echo "  ./stop-all.sh    - Stop all services"
echo "  ./status.sh      - Show this status"
echo "  tail -f logs/bot.log - Follow bot logs"
echo ""
