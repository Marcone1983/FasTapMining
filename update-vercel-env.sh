#!/bin/bash
echo "📝 Updating Vercel environment variables with pooler credentials..."
echo ""

# Database pooler credentials
echo "ZWXnDW00GuExmwLC" | vercel env add DB_PASSWORD production
echo "ZWXnDW00GuExmwLC" | vercel env add DB_PASSWORD preview

echo "aws-1-eu-north-1.pooler.supabase.com" | vercel env add DB_HOST production
echo "aws-1-eu-north-1.pooler.supabase.com" | vercel env add DB_HOST preview

echo "6543" | vercel env add DB_PORT production
echo "6543" | vercel env add DB_PORT preview

echo "postgres.rjrayejemhxuqpydwgcd" | vercel env add DB_USER production
echo "postgres.rjrayejemhxuqpydwgcd" | vercel env add DB_USER preview

echo ""
echo "✅ Environment variables updated!"
echo ""
echo "Now we need to force redeploy..."
