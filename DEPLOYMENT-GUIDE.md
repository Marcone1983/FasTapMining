# 🚀 DEPLOYMENT GUIDE - FasTapMining Enterprise

**Complete step-by-step deployment instructions for production**

---

## 📋 PREREQUISITES

- ✅ Vercel account (for API deployment)
- ✅ Supabase account (for PostgreSQL database)
- ✅ Telegram Bot Token (from @BotFather)
- ✅ TON wallet address (for owner access)
- ✅ TONCenter API key (from https://toncenter.com)

---

## 1️⃣ DATABASE SETUP

### **Step 1: Create Supabase Project**

1. Go to https://supabase.com
2. Create new project
3. Wait for database to provision
4. Note down your credentials:
   - Project URL
   - API Key (anon/public)
   - Direct Database URL

### **Step 2: Execute Database Schema**

1. Open Supabase SQL Editor
2. Copy **entire contents** of `database/EXECUTE-ALL-TABLES-NOW.sql`
3. Paste and execute
4. Verify tables created:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   ORDER BY table_name;
   ```

Expected tables:
- ✅ users
- ✅ mining_pools
- ✅ mining_shares
- ✅ blocks
- ✅ user_balances
- ✅ transactions
- ✅ referrals
- ✅ marketplace_purchases
- ✅ lifetime_access_payments

### **Step 3: Verify ViaBTC Pool**

```sql
SELECT * FROM mining_pools WHERE id = 'viabtc';
```

Should return:
- id: `viabtc`
- name: `ViaBTC Scrypt`
- token: `LTC+DOGE+BELLS+LKY+PEP+JKC+DINGO+SHIC`
- is_active: `true`

---

## 2️⃣ ENVIRONMENT VARIABLES SETUP

### **Required Variables (MUST SET)**

#### **Vercel Environment Variables**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add the following (for **Production**, **Preview**, and **Development**):

```bash
# ========================================
# TELEGRAM BOT
# ========================================
TOKEN_API_BOT=your_telegram_bot_token_here
# Get from: https://t.me/BotFather
# Format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz

# ========================================
# DATABASE (Supabase)
# ========================================
SUPABASE_URL=your_supabase_project_url
# Format: https://abcdefghijk.supabase.co

SUPABASE_KEY=your_supabase_anon_key
# Long JWT token from Supabase project settings

DB_HOST=db.abcdefghijk.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_database_password

# ========================================
# OWNER ACCESS (CRITICAL SECURITY)
# ========================================
OWNER_TELEGRAM_IDS=856208904
# Your Telegram User ID
# Can add multiple comma-separated: 123456,789012

OWNER_WALLET_TON=UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR
# Your TON wallet address (UQ or EQ format)

# ========================================
# ADMIN ACCESS
# ========================================
ADMIN_KEY=generate_a_very_strong_random_key_here
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# NEVER commit this to git!

# ========================================
# TON BLOCKCHAIN
# ========================================
TONCENTER_API_KEY=your_toncenter_api_key
# Get from: https://toncenter.com

# ========================================
# APPLICATION
# ========================================
WEBAPP_URL=https://fas-tap-mining.vercel.app
# Your Vercel deployment URL

NODE_ENV=production

# ========================================
# OPTIONAL
# ========================================
LIFETIME_ACCESS_PRICE=1.0
# Price in TON for lifetime mining access (default: 1.0)

LOG_LEVEL=info
# Logging level: debug | info | warn | error

VIABTC_WORKER_NAME=FasTapMining.001
# ViaBTC worker identifier (optional)
```

### **How to Set Variables in Vercel**

```bash
# Option 1: Vercel Dashboard UI
1. Go to https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add each variable above
5. Select: Production + Preview + Development
6. Save

# Option 2: Vercel CLI
vercel env add OWNER_TELEGRAM_IDS
# Enter value when prompted
# Repeat for each variable
```

---

## 3️⃣ VERCEL DEPLOYMENT

### **Deploy from Git**

```bash
# If repository is already connected to Vercel:
git add .
git commit -m "🚀 Production deployment with security fixes"
git push origin main

# Vercel will auto-deploy
```

### **Manual Deployment**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

---

## 4️⃣ BOT SERVER SETUP (PM2)

### **On Your Server (Termux/Linux)**

```bash
# Navigate to project
cd /data/data/com.termux/files/home/FasTapMining

# Create .env file with same variables as Vercel
cat > .env << 'EOF'
TOKEN_API_BOT=your_telegram_bot_token
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
DB_HOST=db.xxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_db_password
OWNER_TELEGRAM_IDS=856208904
OWNER_WALLET_TON=UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR
ADMIN_KEY=your_generated_admin_key
TONCENTER_API_KEY=your_toncenter_key
WEBAPP_URL=https://fas-tap-mining.vercel.app
NODE_ENV=production
EOF

# Install dependencies
npm install

# Start bot with PM2
pm2 start bot/main.js --name fastap-bot

# Save PM2 configuration
pm2 save

# Setup PM2 startup (optional)
pm2 startup
```

### **Verify Bot is Running**

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs fastap-bot

# Restart if needed
pm2 restart fastap-bot
```

---

## 5️⃣ VERIFICATION & TESTING

### **1. Health Check**

```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-29T...",
  "environment": "production",
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "45ms"
    },
    "environment": {
      "status": "healthy",
      "configured": 5
    }
  }
}
```

### **2. Test Bot**

1. Open Telegram
2. Send `/start` to your bot
3. Verify bot responds with menu
4. Check if owner is recognized (no paywall)

### **3. Test Mining**

1. Open mini app (Start Mining button)
2. Try tapping
3. Verify stats update (taps, hashrate, shares)

### **4. Check Database**

```sql
-- Verify user created
SELECT * FROM users ORDER BY created_at DESC LIMIT 5;

-- Verify shares recorded
SELECT * FROM mining_shares ORDER BY created_at DESC LIMIT 5;

-- Verify pool active
SELECT * FROM mining_pools WHERE id = 'viabtc';
```

---

## 6️⃣ SECURITY CHECKLIST

Before going live, verify:

- [ ] All environment variables set in Vercel
- [ ] `.env` file created on bot server (NOT committed to git)
- [ ] `ADMIN_KEY` is strong random string (64+ characters)
- [ ] `OWNER_TELEGRAM_IDS` contains only your Telegram user ID
- [ ] `OWNER_WALLET_TON` is your correct TON wallet address
- [ ] Database tables created successfully
- [ ] ViaBTC pool exists and is active
- [ ] Health endpoint returns 200 OK
- [ ] Bot responds to /start command
- [ ] Mining tap functionality works
- [ ] Owner access granted automatically (no paywall)

---

## 7️⃣ MONITORING

### **PM2 Monitoring**

```bash
# Real-time logs
pm2 logs fastap-bot --lines 100

# Monitor CPU/Memory
pm2 monit

# Restart on crash
pm2 restart fastap-bot --watch
```

### **Database Monitoring**

```sql
-- Active users
SELECT COUNT(*) FROM users WHERE last_active_at > NOW() - INTERVAL '24 hours';

-- Total shares
SELECT SUM(shares) FROM mining_shares WHERE expires_at > NOW();

-- Recent blocks
SELECT * FROM blocks ORDER BY found_at DESC LIMIT 10;
```

### **API Monitoring**

Check Vercel Dashboard:
- Functions → Usage
- Analytics → Performance
- Logs → Real-time

---

## 🔥 CRITICAL SECURITY NOTES

### **NEVER COMMIT TO GIT:**
- ❌ `.env` file
- ❌ Any file containing `ADMIN_KEY`
- ❌ Any file containing database passwords
- ❌ Any file containing API keys

### **ALREADY PROTECTED:**
- ✅ All hardcoded secrets removed from codebase
- ✅ Environment validation runs on startup
- ✅ Admin endpoints use timing-safe comparison
- ✅ Rate limiting on admin endpoints (10 req/min)
- ✅ HTTPS enforcement in production
- ✅ Request size limits (10KB max)
- ✅ Database connection pooling configured

---

## 📞 SUPPORT

If deployment fails:

1. **Check health endpoint** - should return 200 OK
2. **Check PM2 logs** - `pm2 logs fastap-bot`
3. **Check Vercel logs** - Vercel Dashboard → Functions → Logs
4. **Verify environment variables** - All required vars set?
5. **Check database** - All tables exist?

---

## 🎉 DEPLOYMENT COMPLETE!

Your enterprise-grade mining bot is now live!

**Next steps:**
- Share bot link with users
- Monitor performance via PM2 and Vercel
- Check database for mining activity
- Watch for errors in logs

**Bot URL:** `https://t.me/your_bot_username`
**Mini App:** `https://your-app.vercel.app`

---

**Last Updated:** 2026-01-29
**Version:** 3.0.0 Enterprise
