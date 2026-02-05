#!/bin/bash
# Fix Database Password - Update local .env with correct Supabase password

echo "🔧 FasTapMining - Database Password Fix"
echo "========================================"
echo ""

# Check if password provided as argument
if [ -z "$1" ]; then
  echo "❌ Error: No password provided"
  echo ""
  echo "Usage: bash fix-database-password.sh YOUR_SUPABASE_PASSWORD"
  echo ""
  echo "📋 To get your Supabase password:"
  echo "   1. Go to: https://supabase.com/dashboard"
  echo "   2. Select project: rjrayejemhxuqpydwgcd"
  echo "   3. Go to: Settings → Database"
  echo "   4. Find 'Database Password' (or reset it if you forgot it)"
  echo "   5. Copy the password"
  echo "   6. Run: bash fix-database-password.sh YOUR_PASSWORD"
  echo ""
  exit 1
fi

NEW_PASSWORD="$1"
OLD_PASSWORD=$(grep "^DB_PASSWORD=" .env | cut -d'=' -f2)

echo "Current password: ***${OLD_PASSWORD: -4}"
echo "New password: ***${NEW_PASSWORD: -4}"
echo ""

# Backup .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up .env file"

# Update .env file
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=$NEW_PASSWORD|" .env
sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://postgres:$NEW_PASSWORD@db.rjrayejemhxuqpydwgcd.supabase.co:5432/postgres|" .env

echo "✅ Updated .env file"
echo ""

# Test connection
echo "🔍 Testing database connection..."
node test-db-connection.js

if [ $? -eq 0 ]; then
  echo ""
  echo "=========================================="
  echo "✅ SUCCESS! Database connection fixed!"
  echo "=========================================="
  echo ""
  echo "Next steps:"
  echo "  1. Restart the bot: pm2 restart fastap-bot"
  echo "  2. Test in Telegram: /start"
  echo "  3. Try tapping - stats should update now!"
  echo ""
else
  echo ""
  echo "❌ Connection still failing!"
  echo ""
  echo "Please double-check:"
  echo "  - Password is correct"
  echo "  - No extra spaces or characters"
  echo "  - Password wasn't reset again"
  echo ""
  echo "To restore old password: cp .env.backup.* .env"
  echo ""
  exit 1
fi
