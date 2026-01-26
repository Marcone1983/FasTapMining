#!/usr/bin/env node

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 FasTap Mining - Bot Configuration Guide                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝

Follow these steps to configure your bot with @BotFather:
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Open @BotFather in Telegram                        │
└─────────────────────────────────────────────────────────────┘

1. Open Telegram
2. Search for @BotFather
3. Start a chat with @BotFather
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Set Bot Commands                                   │
└─────────────────────────────────────────────────────────────┘

Send the following to @BotFather:

/mybots
[Select your bot: @FasTapMiningBot]
Edit Commands

Then paste this:

start - Start mining and view your dashboard
balance - Check your crypto balances
stats - View your mining statistics
marketplace - Browse boost items
referral - Get your referral code and stats
help - Get help and support
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Set Bot Description                                │
└─────────────────────────────────────────────────────────────┘

/mybots
[Select your bot]
Edit Description

Paste this short description:

Mine 8 real cryptocurrencies with every tap! LTC, DOGE & more. Powered by ViaBTC pool. Instant TON payouts.

Then set the full description:

FasTap Mining - Real Crypto Mining in Telegram

⛏️ Mine 8 cryptocurrencies: LTC, DOGE, BELLS, LKY, PEP, JKC, DINGO, SHIC
💰 Automatic conversion to TON
🚀 AutoTap: Mine 24/7 without manual tapping
📈 Multipliers: Boost earnings up to 10x
👥 Referral rewards for you and your friends
🔐 Secured by Telegram Cloud Storage

Powered by ViaBTC - one of the world's largest mining pools.

Start mining real crypto today! No hardware, no technical knowledge required.
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Set Bot About Text                                 │
└─────────────────────────────────────────────────────────────┘

/mybots
[Select your bot]
Edit About

Paste this:

Real cryptocurrency mining through Telegram. Mine 8 coins simultaneously - LTC, DOGE, and more. Powered by ViaBTC pool.
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Configure Menu Button                              │
└─────────────────────────────────────────────────────────────┘

/mybots
[Select your bot]
Bot Settings
Menu Button

URL: https://fas-tap-mining.vercel.app
Text: ⛏️ Start Mining
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ Step 6: Configure Mini App                                 │
└─────────────────────────────────────────────────────────────┘

/mybots
[Select your bot]
Bot Settings
Configure Web App

Web App URL: https://fas-tap-mining.vercel.app
`);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│ ✅ Configuration Complete!                                 │
└─────────────────────────────────────────────────────────────┘

Your bot is now configured! Test it by:
1. Opening your bot in Telegram
2. Sending /start
3. Clicking "Start Mining" button

Next step: Deploy your bot!
- Run: npm run bot
- Or: pm2 start ecosystem.config.js
`);
