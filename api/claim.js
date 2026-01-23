module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { userId, amount } = req.body;

    // Logica claim reward
    const royalty = amount * 0.05;
    const netAmount = amount - royalty;

    res.json({
      status: 'claimed',
      amount: netAmount,
      royalty: royalty,
      wallet: process.env.WALLET_RECEIVER
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
