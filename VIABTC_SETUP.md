# ViaBTC Pool Setup - REAL Mining Activation

## Step 1: Create ViaBTC Account

1. Go to: https://www.viabtc.com/signup
2. Register with:
   - Email: (your email)
   - Username: **FastTapMining** (or your choice)
   - Password: (secure password)

3. Verify email

## Step 2: Create LTC Mining Worker

1. Login to ViaBTC
2. Go to: https://www.viabtc.com/account/workers
3. Select: **LTC (Litecoin)**
4. Click: **Add Worker**
5. Worker name: `worker1`
6. Full worker format will be: `YourUsername.worker1`

Example: If username is `FastTapMining`, worker is `FastTapMining.worker1`

## Step 3: Update .env File

Add to `.env`:

```bash
VIABTC_USERNAME=YourUsername
VIABTC_WORKER=YourUsername.worker1
```

Example:
```bash
VIABTC_USERNAME=FastTapMining
VIABTC_WORKER=FastTapMining.worker1
```

## Step 4: Restart Bot

```bash
pkill -f "bot/main"
cd /data/data/com.termux/files/home/FasTapMining
node bot/main.js >> logs/bot.log 2>&1 &
```

Check logs:
```bash
tail -30 logs/bot.log
```

You should see:
```
✅ Connected to ViaBTC Scrypt pool!
✅ Worker authorized: YourUsername.worker1
⛏️ READY TO MINE 8 COINS: LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC
```

## Alternative: Use Public Scrypt Pool (No Registration)

If you don't want to register on ViaBTC, I can configure a public pool that accepts anonymous mining with just a wallet address.

Let me know which option you prefer!
