#!/data/data/com.termux/files/usr/bin/bash
# FasTapMining Bot Auto-Start Script
# Run this when you open Termux to start the bot

echo "🚀 Starting FasTapMining Bot with PM2..."

# Acquire wake lock to prevent Android from killing processes
termux-wake-lock 2>/dev/null
echo "🔒 Wake lock acquired - Bot will run even when Termux is closed"

# Navigate to project directory
cd /data/data/com.termux/files/home/FasTapMining

# Check if PM2 daemon is running
pm2 ping > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "⚡ Starting PM2 daemon..."
  pm2 resurrect > /dev/null 2>&1
fi

# Check if bot is already running
if pm2 list | grep -q "fastap-bot.*online"; then
  echo "✅ Bot is already running!"
  pm2 status
else
  echo "🔄 Starting bot..."
  pm2 start bot/main.js --name "fastap-bot" --log logs/pm2-bot.log --time
  pm2 save
fi

echo ""
echo "📊 Bot Status:"
pm2 status

echo ""
echo "📝 Useful Commands:"
echo "   pm2 status          - Check bot status"
echo "   pm2 logs fastap-bot - View live logs"
echo "   pm2 restart fastap-bot - Restart bot"
echo "   pm2 stop fastap-bot - Stop bot"
echo "   pm2 monit           - Real-time monitoring"
echo ""
echo "✨ Bot is running in background! You can close Termux now."
