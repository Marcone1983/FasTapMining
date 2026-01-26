#!/bin/bash

echo "======================================"
echo "ViaBTC Account Setup - 3 MINUTES"
echo "======================================"
echo ""
echo "📱 STEP 1: Register Account (2 min)"
echo "   Open: https://www.viabtc.com/signup"
echo ""
echo "   Fill form:"
echo "   - Email: [YOUR EMAIL]"
echo "   - Username: FastTapMining"
echo "   - Password: [SECURE PASSWORD - save it!]"
echo "   - Click 'Sign Up'"
echo "   - Check email and verify"
echo ""
read -p "✅ Done? Press ENTER to continue..."
echo ""
echo "======================================"
echo "📱 STEP 2: Create Worker (1 min)"
echo "======================================"
echo ""
echo "   1. Login to ViaBTC"
echo "   2. Go to: https://www.viabtc.com/account/workers"
echo "   3. Select pool: LTC (Litecoin)"
echo "   4. Click 'Add Worker'"
echo "   5. Worker name: worker1"
echo "   6. Click 'Confirm'"
echo ""
echo "   Your worker will be: FastTapMining.worker1"
echo ""
read -p "✅ Done? Press ENTER to continue..."
echo ""
echo "======================================"
echo "⚙️  STEP 3: Configure .env"
echo "======================================"
echo ""
read -p "Enter your ViaBTC username (default: FastTapMining): " USERNAME
USERNAME=${USERNAME:-FastTapMining}

echo ""
echo "Adding to .env file..."
echo "" >> .env
echo "# ViaBTC Pool - REAL 8 COINS MINING" >> .env
echo "MINING_POOL=viabtc" >> .env
echo "VIABTC_USERNAME=$USERNAME" >> .env
echo "VIABTC_WORKER=$USERNAME.worker1" >> .env

echo ""
echo "✅ Configuration saved!"
echo ""
echo "======================================"
echo "🚀 STEP 4: Restart Bot"
echo "======================================"
echo ""
echo "Running restart now..."

# Kill old bot
pkill -9 -f "node bot/main"

# Start new bot
cd /data/data/com.termux/files/home/FasTapMining
node bot/main.js > logs/bot_viabtc.log 2>&1 &

sleep 5

echo ""
echo "======================================"
echo "✅ CHECK LOGS"
echo "======================================"
tail -40 logs/bot_viabtc.log | grep -E "(ViaBTC|Pool|Worker|Mining|READY|8 COINS)"

echo ""
echo "======================================"
echo "🎉 SETUP COMPLETE!"
echo "======================================"
echo ""
echo "Your platform is now mining 8 REAL coins:"
echo "LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC"
echo ""
echo "All users' hashrate is combined under worker:"
echo "$USERNAME.worker1"
echo ""
echo "Check ViaBTC dashboard:"
echo "https://www.viabtc.com/account/workers"
echo ""
echo "You should see hashrate increasing as users tap!"
echo ""
