#!/bin/bash

# FasTap Mining - One-Click Deployment Script
# This script automates the entire deployment process

set -e  # Exit on error

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   🚀 FasTap Mining - One-Click Deploy                       ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo ""
    echo "Please create a .env file with your configuration:"
    echo "  cp .env.example .env"
    echo "  nano .env  # Edit with your actual values"
    echo ""
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Step 1: Checking Prerequisites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js installed$(NC) ($(node --version))"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm installed${NC} ($(npm --version))"

# Check git
if ! command -v git &> /dev/null; then
    echo -e "${YELLOW}⚠️  git is not installed (optional)${NC}"
else
    echo -e "${GREEN}✅ git installed${NC} ($(git --version | head -n1))"
fi

echo ""
echo "📋 Step 2: Installing Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

echo ""
echo "📋 Step 3: Running Database Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/migrate.js
echo -e "${GREEN}✅ Database migrations complete${NC}"

echo ""
echo "📋 Step 4: Running Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node scripts/health-check.js || {
    echo -e "${YELLOW}⚠️  Some health checks failed, but continuing...${NC}"
}

echo ""
echo "📋 Step 5: Creating Logs Directory"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
mkdir -p logs
echo -e "${GREEN}✅ Logs directory ready${NC}"

echo ""
echo "📋 Step 6: Installing PM2 (if not already installed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 installed${NC}"
else
    echo -e "${GREEN}✅ PM2 already installed${NC} ($(pm2 --version))"
fi

echo ""
echo "📋 Step 7: Deploying to Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if command -v vercel &> /dev/null; then
    vercel --prod
    echo -e "${GREEN}✅ Deployed to Vercel${NC}"
else
    echo -e "${YELLOW}⚠️  Vercel CLI not installed, skipping deployment${NC}"
    echo "   Install with: npm install -g vercel"
fi

echo ""
echo "📋 Step 8: Starting Services with PM2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 delete all 2>/dev/null || true  # Delete existing processes
pm2 start ecosystem.config.js
pm2 save
echo -e "${GREEN}✅ All services started${NC}"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║   ✅ Deployment Complete!                                    ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "🎉 Your FasTap Mining app is now live!"
echo ""
echo "📊 Useful Commands:"
echo "   • View logs:       pm2 logs"
echo "   • Monitor status:  pm2 monit"
echo "   • Restart all:     pm2 restart all"
echo "   • Stop all:        pm2 stop all"
echo "   • View processes:  pm2 list"
echo ""
echo "🌐 Your app should be running at:"
echo "   https://fas-tap-mining.vercel.app"
echo ""
echo "🤖 Configure your bot:"
echo "   node scripts/configure-bot.js"
echo ""
echo "📤 Submit to Telegram:"
echo "   See TELEGRAM_APP_VERIFICATION.md for instructions"
echo ""
