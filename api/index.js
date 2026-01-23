// Vercel Serverless Function per mining e WebSocket
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TOKEN_API_BOT);

export default async (req, res) => {
  if (req.method === 'POST') {
    const { userId, tapData } = req.body;
    // Logica mining: aggrega tap, calcola shares
    // Salva in Telegram Cloud Storage (via bot)
    await bot.telegram.sendMessage(userId, JSON.stringify(tapData));
    res.json({ status: 'ok', shares: tapData.shares });
  }
};
