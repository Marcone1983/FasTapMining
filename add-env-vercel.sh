#!/bin/bash
# Add environment variables to Vercel one by one

echo "📝 Adding environment variables to Vercel..."
echo ""

# Function to add env var
add_env() {
  local key=$1
  local value=$2
  echo "Adding: $key"
  echo "$value" | vercel env add "$key" production --yes 2>&1 | grep -v "already exists" || true
  echo "$value" | vercel env add "$key" preview --yes 2>&1 | grep -v "already exists" || true
}

# Database - Using Pooler (better for Vercel serverless)
add_env "SUPABASE_URL" "https://rjrayejemhxuqpydwgcd.supabase.co"
add_env "SUPABASE_KEY" "sb_publishable_t37mM3wpKrxF30H3jaWCZA_Xh4edX44"
add_env "DB_HOST" "aws-1-eu-north-1.pooler.supabase.com"
add_env "DB_PORT" "6543"
add_env "DB_NAME" "postgres"
add_env "DB_USER" "postgres.rjrayejemhxuqpydwgcd"
add_env "DB_PASSWORD" "ZWXnDW00GuExmwLC"

# Bot
add_env "TOKEN_API_BOT" "8522765476:AAEySnA_iC5aEHBko2NAAfvdziLphEKHGBc"
add_env "WEBAPP_URL" "https://fas-tap-mining.vercel.app"

# Owner
add_env "OWNER_TELEGRAM_IDS" "856208904"
add_env "OWNER_WALLET_TON" "UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR"

# TON
add_env "TONCENTER_API_KEY" "d36c1090bf34ff78d8137f1af4acf583e073b91f086d80fa600afbd1791d9498"

# Admin
add_env "ADMIN_KEY" "0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e"

# System
add_env "NODE_ENV" "production"

echo ""
echo "✅ All environment variables updated!"
echo ""
echo "🔄 Redeploying..."
vercel --prod --force

echo ""
echo "✅ Done! Wait 1-2 minutes, then test:"
echo "curl https://fas-tap-mining.vercel.app/api/health"
