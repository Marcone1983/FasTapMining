const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  const bot = new Telegraf(process.env.TOKEN_API_BOT);

  if (req.method === 'POST') {
    const { userId, shares } = req.body;

    // Logica mining: ogni 1000 shares = 1 NOT
    if (shares % 1000 === 0) {
      const reward = 1;
      const royalty = reward * 0.05;
      const netReward = reward - royalty;

      // Invia reward (simulato - in produzione usa TON API)
      await bot.telegram.sendMessage(
        userId,
        `🎉 Hai guadagnato ${netReward} NOT! (Royalty: ${royalty} NOT)`
      );
    }

    res.json({ status: 'ok' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
