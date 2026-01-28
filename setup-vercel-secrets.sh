#!/data/data/com.termux/files/usr/bin/bash
# Auto-setup script for GitHub Secrets (Vercel Deploy)

set -e

echo "🔐 GitHub Secrets Setup - FasTapMining"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm i -g vercel
fi

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) not installed${NC}"
    echo ""
    echo "Install it with:"
    echo "  pkg install gh"
    echo "  gh auth login"
    echo ""
    exit 1
fi

echo -e "${BLUE}📍 Step 1: Link Vercel Project${NC}"
echo ""

# Check if already linked
if [ -f ".vercel/project.json" ]; then
    echo -e "${GREEN}✅ Project already linked to Vercel${NC}"
else
    echo "Linking to Vercel..."
    vercel link
fi

echo ""
echo -e "${BLUE}📍 Step 2: Extract Vercel IDs${NC}"
echo ""

if [ ! -f ".vercel/project.json" ]; then
    echo -e "${RED}❌ .vercel/project.json not found${NC}"
    echo "Run: vercel link"
    exit 1
fi

# Extract IDs
ORG_ID=$(cat .vercel/project.json | grep "orgId" | cut -d'"' -f4)
PROJECT_ID=$(cat .vercel/project.json | grep "projectId" | cut -d'"' -f4)

echo "Vercel Org ID: $ORG_ID"
echo "Vercel Project ID: $PROJECT_ID"

echo ""
echo -e "${BLUE}📍 Step 3: Get Environment Variables${NC}"
echo ""

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Extract from .env
DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2)
WEBAPP_URL=$(grep "^WEBAPP_URL=" .env | cut -d'=' -f2)

echo "Database URL: ${DATABASE_URL:0:30}..."
echo "WebApp URL: $WEBAPP_URL"

echo ""
echo -e "${YELLOW}⚠️  Step 4: Create Vercel Token${NC}"
echo ""
echo "1. Go to: https://vercel.com/account/tokens"
echo "2. Click 'Create Token'"
echo "3. Name: GitHub Actions Deploy"
echo "4. Scope: Full Account"
echo "5. Copy the token"
echo ""
read -p "Paste your Vercel Token here: " VERCEL_TOKEN

if [ -z "$VERCEL_TOKEN" ]; then
    echo -e "${RED}❌ No token provided${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}📍 Step 5: Set GitHub Secrets${NC}"
echo ""

# Check if gh is authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ Not logged in to GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo "Setting secrets..."

# Set secrets
gh secret set VERCEL_TOKEN -b"$VERCEL_TOKEN"
echo -e "${GREEN}✅ VERCEL_TOKEN set${NC}"

gh secret set VERCEL_ORG_ID -b"$ORG_ID"
echo -e "${GREEN}✅ VERCEL_ORG_ID set${NC}"

gh secret set VERCEL_PROJECT_ID -b"$PROJECT_ID"
echo -e "${GREEN}✅ VERCEL_PROJECT_ID set${NC}"

gh secret set DATABASE_URL -b"$DATABASE_URL"
echo -e "${GREEN}✅ DATABASE_URL set${NC}"

gh secret set WEBAPP_URL -b"$WEBAPP_URL"
echo -e "${GREEN}✅ WEBAPP_URL set${NC}"

echo ""
echo -e "${GREEN}🎉 All secrets configured!${NC}"
echo ""
echo -e "${BLUE}📍 Step 6: Test Auto-Deploy${NC}"
echo ""
echo "Trigger a test deploy:"
echo "  git commit --allow-empty -m 'test: verify auto-deploy'"
echo "  git push origin main"
echo ""
echo "Check workflow status:"
echo "  https://github.com/Marcone1983/FasTapMining/actions"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
