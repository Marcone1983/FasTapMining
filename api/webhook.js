module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const { transaction } = req.body;

    // Verifica transazione e attiva boost
    console.log('Webhook ricevuto:', transaction);

    res.json({ status: 'processed' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
