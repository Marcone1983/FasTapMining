#!/bin/bash
cd /data/data/com.termux/files/home/FasTapMining

# Kill old bot
pkill -9 -f "node bot/main.js"

sleep 2

# Start new bot
node bot/main.js >> logs/bot.log 2>&1 &
NEW_PID=$!

echo "Bot restarted with PID: $NEW_PID"

sleep 3

echo ""
echo "Last 20 lines of log:"
tail -20 logs/bot.log

echo ""
echo "Bot process:"
ps aux | grep "node bot/main" | grep -v grep
