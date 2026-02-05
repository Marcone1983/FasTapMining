#!/bin/bash
# ============================================
# Deploy FasTapMining to Vercel
# ============================================

set -e  # Exit on error

echo "🚀 FasTapMining - Vercel Deploy Script"
echo "========================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found!"
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
    echo "✅ Vercel CLI installed!"
    echo ""
fi

# Step 1: Login
echo "📝 Step 1: Vercel Login"
echo "------------------------"
echo "This will open a browser for authentication."
echo ""
vercel login

echo ""
echo "✅ Logged in successfully!"
echo ""

# Step 2: Link project
echo "📁 Step 2: Link Project"
echo "------------------------"
echo ""
vercel link

echo ""
echo "✅ Project linked!"
echo ""

# Step 3: Deploy
echo "🚀 Step 3: Deploy to Production"
echo "--------------------------------"
echo ""
echo "Deploying with environment variables from .env..."
echo ""
vercel --prod

echo ""
echo "========================================"
echo "✅ DEPLOYMENT COMPLETE!"
echo "========================================"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣  Test health endpoint:"
echo "   curl https://fas-tap-mining.vercel.app/api/health"
echo ""
echo "2️⃣  Restart bot:"
echo "   pm2 restart fastap-bot"
echo ""
echo "3️⃣  Test in Telegram:"
echo "   Open bot → /start → Start Mining → Tap 10 times"
echo ""
echo "4️⃣  Verify stats update (should show taps, hashrate, shares)"
echo ""
