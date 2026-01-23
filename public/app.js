const { useState, useEffect } = React;

function App() {
  const [shares, setShares] = useState(0);
  const [wallet, setWallet] = useState(null);
  const [boosts, setBoosts] = useState({});

  useEffect(() => {
    window.Telegram.WebApp.ready();
    loadData();
  }, []);

  const loadData = async () => {
    const saved = localStorage.getItem('shares') || '0';
    setShares(parseInt(saved));

    const savedBoosts = JSON.parse(localStorage.getItem('boosts') || '{}');
    setBoosts(savedBoosts);
  };

  const handleTap = () => {
    const increment = boosts.multitap ? 2 : 1;
    const newShares = shares + increment;
    setShares(newShares);
    localStorage.setItem('shares', String(newShares));

    fetch('/api/index', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: window.Telegram.WebApp.initDataUnsafe.user?.id,
        shares: newShares
      })
    });
  };

  const buyBoost = (id, price) => {
    const tonLink = `ton://transfer/UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR?amount=${price * 1000000000}&text=${id}`;
    window.open(tonLink, '_blank');

    const newBoosts = { ...boosts, [id]: true };
    setBoosts(newBoosts);
    localStorage.setItem('boosts', JSON.stringify(newBoosts));
  };

  return (
    <div className="App">
      <h1>⚡ FasTapMining</h1>
      <p>Shares: {shares}</p>
      <div className="tap-zone" onClick={handleTap}>
        TAP TO MINE
      </div>

      <div className="marketplace">
        <h3>⚡ Boost Marketplace</h3>
        {[
          { id: 'autotap', name: 'AutoTap', price: 0.1, effect: '+1/sec' },
          { id: 'multitap', name: 'MultiTap', price: 0.5, effect: 'x2 per tap' },
          { id: 'luckytap', name: 'LuckyTap', price: 1, effect: '10% x10 reward' }
        ].map(b => (
          <div key={b.id} className="boost-item">
            <span>{b.name} - {b.effect}</span>
            <button onClick={() => buyBoost(b.id, b.price)}>
              Buy {b.price} TON
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
