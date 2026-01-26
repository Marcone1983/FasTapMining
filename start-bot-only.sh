#!/bin/bash
cd /data/data/com.termux/files/home/FasTapMining

echo "Starting FasTap Mining Bot with REAL mining engine..."
node bot/main.js >> logs/bot.log 2>&1 &
BOT_PID=$!

echo "Bot started with PID: $BOT_PID"
sleep 3

echo ""
echo "=== Last 25 lines of log ==="
tail -25 logs/bot.log

echo ""
echo "=== Bot process ==="
ps aux | grep "node bot/main" | grep -v grep
