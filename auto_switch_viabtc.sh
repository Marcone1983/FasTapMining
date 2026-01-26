#!/bin/bash

echo "========================================="
echo "  AUTO SWITCH TO VIABTC - 8 COINS"
echo "========================================="
echo ""
echo "✅ Configuration already updated!"
echo ""
echo "When you complete ViaBTC registration:"
echo "1. Register at: https://www.viabtc.com/signup"
echo "2. Email: whitecasteddu@gmail.com"
echo "3. Username: FastTapMining"
echo "4. Verify email (check inbox)"
echo "5. Login → Workers → Add Worker → LTC → worker1"
echo ""
echo "Then I'll automatically switch to 8 coins mining!"
echo ""
echo "Current status: Waiting for you to complete registration..."
echo ""
echo "========================================="
echo ""

# Wait for user confirmation
read -p "Press ENTER when you've completed ALL steps above..."

echo ""
echo "🔄 Switching to ViaBTC (8 coins)..."
echo ""

# Kill current bot
pkill -9 -f "node bot/main"
sleep 2

# Start bot with ViaBTC config
cd /data/data/com.termux/files/home/FasTapMining
node bot/main.js > logs/bot_viabtc.log 2>&1 &

echo "⏳ Waiting for connection..."
sleep 6

echo ""
echo "========================================="
echo "  CONNECTION STATUS"
echo "========================================="
echo ""

# Check logs for success
tail -50 logs/bot_viabtc.log | grep -E "(Pool:|Worker:|READY TO MINE|8 COINS|authorized|Connected)" | tail -20

echo ""
echo "========================================="
echo ""

# Check if authorized
if grep -q "Worker authorized: FastTapMining.worker1" logs/bot_viabtc.log; then
    echo "✅ SUCCESS! Mining 8 COINS on ViaBTC!"
    echo ""
    echo "Active coins: LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC"
    echo ""
    echo "Check ViaBTC dashboard:"
    echo "https://www.viabtc.com/account/workers"
    echo ""
    echo "You should see FastTapMining.worker1 with hashrate increasing!"
    echo ""
elif grep -q "Authorization failed" logs/bot_viabtc.log; then
    echo "⚠️  Authorization failed - Did you create the worker?"
    echo ""
    echo "Go to: https://www.viabtc.com/account/workers"
    echo "- Select: LTC pool"
    echo "- Click: Add Worker"
    echo "- Name: worker1"
    echo ""
    echo "Then run this script again!"
    echo ""
else
    echo "⏳ Still connecting... Check logs:"
    echo "tail -f logs/bot_viabtc.log"
    echo ""
fi

echo "========================================="
