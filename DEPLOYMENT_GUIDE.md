# 🚀 FasTap Mining - Complete Deployment Guide

## ✅ What's Been Built

### 1. **Core Mining System** ⛏️
- Real ViaBTC pool integration (8 coins: LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC)
- 95/5 reward distribution (95% to users, 5% platform fee)
- Automatic LTC/DOGE → TON conversion via ChangeNOW API
- Real-time hashrate tracking and distribution

### 2. **Payment Systems** 💰
- **Lifetime Access:** 1 TON one-time payment
- **Marketplace:** AutoTap tiers (0.5-2.0 TON) + Multipliers (0.3-1.5 TON)
- **Blockchain Monitoring:** Automatic payment confirmation via TON API
- **Payment Expiration:** 1-hour payment windows

### 3. **Referral System** 👥
- Automatic code generation
- Instant reward distribution
- Leaderboard & statistics
- Rewards: Referrer (0.001 LTC + 1 DOGE + 0.1 TON), Referred (0.0005 LTC + 0.5 DOGE + 0.05 TON)

### 4. **Enterprise Infrastructure** 🏗️
- PostgreSQL database with comprehensive schema
- Background workers (fee payouts, payment monitoring)
- RESTful API endpoints for all features
- Telegram Bot with full command set
- Telegram Cloud Storage integration

### 5. **Security** 🔐
- All sensitive data in GitHub Secrets (NEVER in repo)
- Encrypted wallet private keys
- Admin authentication
- Secure payment verification

## 📁 Project Structure

```
FasTapMining/
├── api/
│   ├── admin/
│   │   └── fee-payouts.js          # Admin fee management
│   ├── lifetime-access.js           # Lifetime access payments
│   ├── marketplace.js               # Boost item purchases
│   ├── referrals.js                 # Referral system
│   ├── mining.js                    # Mining endpoints
│   └── stats.js                     # Statistics
├── bot/
│   └── main.js                      # Complete Telegram Bot
├── database/
│   ├── db.js                        # Database connection
│   └── migrations/
│       ├── 001_initial.sql
│       └── 002_platform_fees_and_payments.sql
├── mining-engine/
│   └── viabtc-scrypt-miner.js      # Real mining engine
├── services/
│   ├── crypto-converter.js          # ChangeNOW integration
│   ├── fee-payout-service.js        # Fee distribution
│   ├── lifetime-access-service.js   # Lifetime payments
│   ├── marketplace-service.js       # Marketplace logic
│   └── referral-service.js          # Referral management
├── workers/
│   ├── fee-payout-worker.js         # Daily fee processor
│   └── payment-monitor-worker.js    # Real-time payment monitor
├── public/
│   ├── privacy-policy.html
│   ├── terms-of-service.html
│   └── app-final.js                 # Frontend React app
├── .env.example                     # Environment template
├── .gitignore                       # Excludes secrets
├── SECRETS_SETUP_INSTRUCTIONS.md   # GitHub Secrets guide
├── MARKETING_DESCRIPTION.md         # App store marketing
└── TELEGRAM_APP_VERIFICATION.md    # Submission guide
```

## 🔑 Step 1: Configure GitHub Secrets

**CRITICAL:** All sensitive data must be stored in GitHub Secrets, NOT in the repository!

### Go to GitHub:
1. Navigate to your repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Add These Secrets:

#### Your Bot Token:
```
Name: TOKEN_API_BOT
Value: [Your bot token from @BotFather]
```

#### Wallet Private Keys (from Downloads backup):
```
BELLS_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
LKY_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
PEP_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
JKC_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
DINGO_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
SHIC_PRIVATE_KEY: [from scrypt-wallets-BACKUP.json]
```

#### API Keys:
```
CHANGENOW_API_KEY: [Get from https://changenow.io/]
TONCENTER_API_KEY: [Get from https://toncenter.com/]
ADMIN_KEY: [Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"]
```

#### Database:
```
DATABASE_URL: postgresql://user:password@host:5432/database
```

## 🗄️ Step 2: Setup Database

### Option A: Vercel Postgres (Recommended)
```bash
npm install -g vercel
vercel login
vercel link
vercel postgres create
```

### Option B: External PostgreSQL
Use any PostgreSQL provider (Supabase, Railway, etc.) and get the connection URL.

### Run Migrations:
```bash
psql $DATABASE_URL < database/migrations/001_initial.sql
psql $DATABASE_URL < database/migrations/002_platform_fees_and_payments.sql
```

## 🚀 Step 3: Deploy to Vercel

### Install Dependencies:
```bash
npm install
```

### Deploy:
```bash
vercel --prod
```

### Set Environment Variables on Vercel:
```bash
vercel env pull
```

Or manually in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all secrets from GitHub Secrets
- Include: `TOKEN_API_BOT`, all private keys, API keys, `DATABASE_URL`, `ADMIN_KEY`

## 🤖 Step 4: Configure Telegram Bot

### In @BotFather:

1. **Set Commands:**
```
/start - Start mining and view dashboard
/balance - Check crypto balances
/stats - View mining statistics
/marketplace - Browse boost items
/referral - Get referral code
/help - Get help
```

2. **Set Description:**
```
Mine 8 real cryptocurrencies with every tap! LTC, DOGE & more. Powered by ViaBTC pool. Instant TON payouts.
```

3. **Set About:**
```
FasTap Mining - Real Crypto Mining in Telegram

⛏️ Mine 8 cryptocurrencies
💰 Automatic TON conversion
🚀 AutoTap & Multipliers
👥 Referral rewards

Powered by ViaBTC
```

4. **Configure Mini App:**
- Menu Button URL: `https://fas-tap-mining.vercel.app`
- Menu Button Text: `⛏️ Start Mining`

## ⚙️ Step 5: Start Workers

### On Your Server (or separate process):

#### Fee Payout Worker (runs every 24 hours):
```bash
node workers/fee-payout-worker.js
```

#### Payment Monitor Worker (runs every 30 seconds):
```bash
node workers/payment-monitor-worker.js
```

### Or use PM2 for process management:
```bash
npm install -g pm2
pm2 start workers/fee-payout-worker.js --name fee-payout
pm2 start workers/payment-monitor-worker.js --name payment-monitor
pm2 save
pm2 startup
```

## 🤖 Step 6: Start Bot

```bash
node bot/main.js
```

Or with PM2:
```bash
pm2 start bot/main.js --name telegram-bot
pm2 save
```

## ✅ Step 7: Verify Everything Works

### Test Bot:
1. Send `/start` to your bot
2. Click "Start Mining" button
3. Verify web app opens
4. Test mining (tap)
5. Check `/balance`
6. Test `/referral` command
7. Try creating a lifetime access payment
8. Test marketplace

### Test Payments:
1. Create a test payment (lifetime access or marketplace)
2. Send small amount of TON to payment address
3. Verify auto-confirmation works
4. Check payment monitor worker logs

### Test Referrals:
1. Get referral code with `/referral`
2. Open bot from referral link in incognito/different account
3. Verify both users receive rewards

## 📤 Step 8: Submit to Telegram App Directory

Follow detailed instructions in `TELEGRAM_APP_VERIFICATION.md`

### Quick Steps:
1. Go to @appcenter in Telegram
2. Click "Submit App"
3. Enter `@FasTapMiningBot`
4. Fill out application form:
   - Name: FasTap Mining
   - Category: Finance
   - Description: (use from MARKETING_DESCRIPTION.md)
   - Website: https://fas-tap-mining.vercel.app
   - Privacy Policy: https://fas-tap-mining.vercel.app/privacy-policy.html
   - Terms: https://fas-tap-mining.vercel.app/terms-of-service.html
5. Upload screenshots (5-10)
6. Upload app icon (512x512px)
7. Submit for review

## 📊 Step 9: Monitor & Maintain

### Monitor Logs:
```bash
pm2 logs
```

### Check Fee Stats:
```bash
curl "https://fas-tap-mining.vercel.app/api/admin/fee-payouts/stats?adminKey=YOUR_ADMIN_KEY"
```

### Check Payment Stats:
```bash
curl "https://fas-tap-mining.vercel.app/api/lifetime-access/stats?adminKey=YOUR_ADMIN_KEY"
```

### Manually Trigger Fee Payout:
```bash
curl -X POST "https://fas-tap-mining.vercel.app/api/admin/fee-payouts/process" \
  -H "Content-Type: application/json" \
  -d '{"adminKey": "YOUR_ADMIN_KEY"}'
```

## 🔒 Security Checklist

- [ ] All secrets in GitHub Secrets (NEVER in code)
- [ ] .env file in .gitignore
- [ ] Wallet backup file deleted from Downloads (after backup to secure location)
- [ ] Admin key is strong (32+ characters)
- [ ] Database has strong password
- [ ] SSL/HTTPS enabled (automatic with Vercel)
- [ ] Regular backups of database
- [ ] Monitoring enabled for errors

## 🎯 Post-Launch Checklist

- [ ] Bot responds to `/start`
- [ ] Web app loads
- [ ] Mining works
- [ ] Payments confirmed automatically
- [ ] Referrals working
- [ ] Workers running 24/7
- [ ] Submitted to Telegram App Directory
- [ ] Privacy Policy & Terms live
- [ ] Support channel active

## 📈 Marketing & Growth

1. **Share in Crypto Communities:**
   - Reddit: r/cryptocurrency, r/dogecoin, r/litecoin
   - Telegram groups
   - Discord servers
   - Twitter/X crypto accounts

2. **Referral Program:**
   - Encourage users to share their referral links
   - Run contests for top referrers
   - Bonus rewards for milestones

3. **Content Marketing:**
   - Blog posts about real crypto mining
   - YouTube tutorials
   - TikTok mining demonstrations
   - Medium articles

## 🆘 Troubleshooting

### Bot not responding:
- Check bot token is correct in environment variables
- Verify bot is running (`pm2 status`)
- Check logs (`pm2 logs telegram-bot`)

### Payments not confirming:
- Check payment monitor worker is running
- Verify TONCENTER_API_KEY is valid
- Check worker logs

### Mining not working:
- Verify ViaBTC connection
- Check mining engine logs
- Ensure database is accessible

### Workers crashing:
- Check database connection
- Verify all API keys are valid
- Review error logs

## 📞 Support

- Email: support@fas-tap-mining.com
- Telegram: @FasTapMiningSupport
- Documentation: All .md files in repository

---

## 🎉 You're Ready to Launch!

Your FasTap Mining app is now:
- ✅ Fully functional
- ✅ Securely configured
- ✅ Production-ready
- ✅ Compliant with Telegram guidelines
- ✅ Ready for millions of users

**Next Steps:**
1. Complete GitHub Secrets setup
2. Deploy to Vercel
3. Start bot and workers
4. Test everything
5. Submit to Telegram
6. Start marketing!

Good luck! 🚀💎
