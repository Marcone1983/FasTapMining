const { useState, useEffect } = React;

function App() {
  const [selectedPool, setSelectedPool] = useState('minex');
  const [taps, setTaps] = useState(0);
  const [rewards, setRewards] = useState({ MineX: 0, tBTC: 0, MRDN: 0, nfts: [] });
  const [stats, setStats] = useState(null);
  const [lastBlock, setLastBlock] = useState(null);
  const [pendingShares, setPendingShares] = useState(0);
  const [walletAddress, setWalletAddress] = useState('');
  const [userId, setUserId] = useState(null);
  const [showShop, setShowShop] = useState(false);
  const [shopItems, setShopItems] = useState([]);
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(false);
  const [accessData, setAccessData] = useState(null);
  const [autoTapData, setAutoTapData] = useState(null);
  const [accumulatedAutoTap, setAccumulatedAutoTap] = useState(0);

  const pools = {
    minex: { name: 'MineX', token: 'MineX', color: '#00ff88', weight: '40%', reward: '100' },
    tbtc: { name: 'TonBitcoin', token: 'tBTC', color: '#ff9500', weight: '30%', reward: '50' },
    mrdn: { name: 'Meridian', token: 'MRDN', color: '#5856d6', weight: '30%', reward: '1000', nft: true }
  };

  useEffect(() => {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      setUserId(user.id);
      checkLifetimeAccess(user.id);
    }

    // Auto-refresh stats every 10 seconds
    const interval = setInterval(() => loadStats(), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hasLifetimeAccess && userId) {
      loadUserData(userId);
      loadStats();
      loadShop();
      loadAutoTap(userId);

      // Auto-refresh AutoTap every 5 seconds
      const autoTapInterval = setInterval(() => loadAutoTap(userId), 5000);
      return () => clearInterval(autoTapInterval);
    }
  }, [hasLifetimeAccess, userId]);

  const checkLifetimeAccess = async (uid) => {
    try {
      const res = await fetch(`/api/access?userId=${uid}`);
      const data = await res.json();

      if (data.success && data.hasAccess) {
        setHasLifetimeAccess(true);
      } else if (data.requiresPayment) {
        setAccessData(data.payment);
      }
    } catch (e) {
      console.error('Access check error:', e);
    }
  };

  const handlePaymentVerification = async (txHash) => {
    if (!userId) return;

    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          transactionHash: txHash,
          amount: 1
        })
      });

      const data = await res.json();

      if (data.success && data.hasAccess) {
        setHasLifetimeAccess(true);
        setAccessData(null);
        window.Telegram.WebApp.showAlert('✅ Lifetime access activated! Welcome to FasTapMining!');
      } else {
        window.Telegram.WebApp.showAlert('❌ Payment verification failed. Please try again.');
      }
    } catch (e) {
      window.Telegram.WebApp.showAlert('Verification error: ' + e.message);
    }
  };

  const loadUserData = async (uid) => {
    try {
      const res = await fetch(`/api/claim?userId=${uid}`);
      const data = await res.json();
      if (data.success) {
        setRewards(data.rewards);
      }
    } catch (e) {
      console.error('Load user data error:', e);
    }
  };

  const loadAutoTap = async (uid) => {
    try {
      const res = await fetch(`/api/autotap?userId=${uid}`);
      const data = await res.json();

      if (data.success) {
        if (data.hasAutoTap) {
          setAutoTapData(data.autoTap);
          setAccumulatedAutoTap(data.autoTap.accumulatedShares);
        } else {
          setAutoTapData(null);
        }
      }
    } catch (e) {
      console.error('Load AutoTap error:', e);
    }
  };

  const handleClaimAutoTap = async () => {
    if (!userId || !autoTapData) return;

    try {
      const res = await fetch('/api/autotap', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
      });

      const data = await res.json();

      if (data.success) {
        window.Telegram.WebApp.showAlert(
          `✅ ${data.message}\n\nClaimed ${data.claimed} shares!`
        );
        setAccumulatedAutoTap(0);
        setPendingShares(prev => prev + data.claimed);
      } else {
        window.Telegram.WebApp.showAlert(`❌ ${data.error}`);
      }
    } catch (e) {
      window.Telegram.WebApp.showAlert('Claim AutoTap error: ' + e.message);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Load stats error:', e);
    }
  };

  const loadShop = async () => {
    try {
      const res = await fetch(`/api/shop?userId=${userId || 0}`);
      const data = await res.json();
      if (data.success) {
        setShopItems(data.items);
      }
    } catch (e) {
      console.error('Load shop error:', e);
    }
  };

  const handleTap = async () => {
    if (!userId) return;

    const newTaps = taps + 1;
    setTaps(newTaps);

    // Generate random nonce for hash
    const nonce = Math.floor(Math.random() * 1000000);

    try {
      const res = await fetch('/api/mining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          taps: newTaps,
          poolId: selectedPool,
          nonce: nonce
        })
      });

      const data = await res.json();

      if (data.success) {
        setPendingShares(data.pendingShares);

        if (data.blockFound) {
          // BLOCK FOUND!
          setLastBlock(data);

          // Add rewards
          const pool = pools[selectedPool];
          setRewards(prev => ({
            ...prev,
            [pool.token]: prev[pool.token] + data.finderReward.amount
          }));

          // Notify backend
          await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: userId,
              blockData: data,
              type: 'block_found'
            })
          });

          // Reload stats
          loadStats();

          // Show celebration
          showBlockFoundAnimation(data);
        }
      }
    } catch (e) {
      console.error('Mining error:', e);
    }
  };

  const handleClaim = async () => {
    if (!walletAddress || !userId) {
      window.Telegram.WebApp.showAlert('Please enter your TON wallet address');
      return;
    }

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          walletAddress: walletAddress
        })
      });

      const data = await res.json();

      if (data.success) {
        window.Telegram.WebApp.showAlert(
          `✅ ${data.message}\n\nTransactions: ${data.transactions.length}\nNFTs: ${data.nfts.length}`
        );
        setRewards({ MineX: 0, tBTC: 0, MRDN: 0, nfts: [] });
      } else {
        window.Telegram.WebApp.showAlert(`❌ ${data.error}`);
      }
    } catch (e) {
      window.Telegram.WebApp.showAlert('Claim failed: ' + e.message);
    }
  };

  // COMPLIANT: Purchase with Telegram Stars
  const handlePurchase = async (item) => {
    if (!userId) return;

    try {
      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          itemId: item.id
        })
      });

      const data = await res.json();

      if (data.success) {
        window.Telegram.WebApp.showAlert(
          `✅ ${data.message}\n\nCheck your Telegram for the payment invoice.`
        );
      } else {
        window.Telegram.WebApp.showAlert(`❌ ${data.error || 'Purchase failed'}`);
      }
    } catch (e) {
      window.Telegram.WebApp.showAlert('Purchase error: ' + e.message);
    }
  };

  const showBlockFoundAnimation = (data) => {
    const modal = document.createElement('div');
    modal.className = 'block-found-modal';
    modal.innerHTML = `
      <div class="block-found-content">
        <h1>🎉 BLOCK FOUND! 🎉</h1>
        <p>Pool: ${data.pool}</p>
        <p>Block #${data.blockHeight}</p>
        <h2>+${data.finderReward.amount} ${data.finderReward.token}</h2>
        ${data.nftReward ? `<p>🎨 NFT: ${data.nftReward.character} (${data.nftReward.rarity})</p>` : ''}
        <button onclick="this.parentElement.parentElement.remove()">Continue Mining</button>
      </div>
    `;
    document.body.appendChild(modal);
  };

  const currentPool = pools[selectedPool];

  // LIFETIME ACCESS PAYWALL
  if (!hasLifetimeAccess && accessData) {
    return (
      <div className="App">
        <div className="paywall-screen">
          <div className="paywall-content">
            <h1>⚡ FasTapMining</h1>
            <h2>Lifetime Access Required</h2>
            <p className="paywall-description">
              Pay once, mine forever!<br/>
              Real multi-token mining on TON blockchain
            </p>

            <div className="paywall-price">
              <div className="price-amount">1 TON</div>
              <div className="price-label">One-time payment</div>
            </div>

            <div className="paywall-features">
              <div className="feature">✅ Unlimited mining access</div>
              <div className="feature">✅ Mine MineX, tBTC, MRDN</div>
              <div className="feature">✅ NFT rewards from pools</div>
              <div className="feature">✅ 70% finder rewards</div>
              <div className="feature">✅ Access to boost shop</div>
              <div className="feature">✅ AutoTap passive mining</div>
            </div>

            <button
              className="payment-btn"
              onClick={() => window.Telegram.WebApp.openLink(accessData.deepLink)}
            >
              💳 Pay 1 TON - Unlock Forever
            </button>

            <div className="payment-info">
              <p>Payment to: <code>{accessData.wallet}</code></p>
              <p className="payment-note">After payment, enter transaction hash below:</p>
            </div>

            <div className="verify-section">
              <input
                type="text"
                placeholder="Enter transaction hash"
                id="txHashInput"
                className="tx-input"
              />
              <button
                className="verify-btn"
                onClick={() => {
                  const txHash = document.getElementById('txHashInput').value;
                  if (txHash) handlePaymentVerification(txHash);
                }}
              >
                Verify Payment
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOADING STATE
  if (!hasLifetimeAccess) {
    return (
      <div className="App">
        <div className="loading-screen">
          <h1>⚡ FasTapMining</h1>
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header>
        <h1>⚡ FasTapMining</h1>
        <p className="subtitle">Real Multi-Pool Mining on TON</p>
      </header>

      {/* AutoTap Status Banner */}
      {autoTapData && (
        <div className="autotap-banner">
          <div className="autotap-info">
            <div className="autotap-header">
              <span className="autotap-icon">{autoTapData.tier.includes('lifetime') ? '👑' : autoTapData.tier.includes('ultimate') ? '🔥' : autoTapData.tier.includes('pro') ? '⚡' : '🤖'}</span>
              <span className="autotap-label">AutoTap Active</span>
            </div>
            <div className="autotap-stats">
              <div className="autotap-stat">
                <span className="stat-label">Mining Speed:</span>
                <span className="stat-value">+{autoTapData.sharesPerSecond}/sec</span>
              </div>
              <div className="autotap-stat">
                <span className="stat-label">Accumulated:</span>
                <span className="stat-value">{accumulatedAutoTap} shares</span>
              </div>
              <div className="autotap-stat">
                <span className="stat-label">Daily Estimate:</span>
                <span className="stat-value">{autoTapData.estimatedDaily.toLocaleString()}</span>
              </div>
              {!autoTapData.isLifetime && (
                <div className="autotap-stat">
                  <span className="stat-label">Expires:</span>
                  <span className="stat-value">{new Date(autoTapData.expiresAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          {accumulatedAutoTap > 0 && (
            <button className="claim-autotap-btn" onClick={handleClaimAutoTap}>
              Claim {accumulatedAutoTap} Shares
            </button>
          )}
        </div>
      )}

      {/* Pool Selection */}
      <div className="pool-selector">
        <h3>Select Mining Pool</h3>
        <div className="pool-buttons">
          {Object.entries(pools).map(([id, pool]) => (
            <button
              key={id}
              className={`pool-btn ${selectedPool === id ? 'active' : ''}`}
              style={{ borderColor: pool.color }}
              onClick={() => setSelectedPool(id)}
            >
              <div className="pool-name">{pool.name}</div>
              <div className="pool-token">{pool.token}</div>
              <div className="pool-weight">Weight: {pool.weight}</div>
              <div className="pool-reward">Reward: {pool.reward}</div>
              {pool.nft && <div className="pool-nft">🎨 +NFT</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Mining Area */}
      <div className="mining-section">
        <div className="tap-zone"
             style={{ background: `radial-gradient(circle, ${currentPool.color}, #00aaff)` }}
             onClick={handleTap}>
          <div className="tap-content">
            <div className="pool-label">{currentPool.name}</div>
            <div className="tap-label">TAP TO MINE</div>
            <div className="tap-count">{taps} taps</div>
          </div>
        </div>

        <div className="mining-stats">
          <div className="stat">
            <span className="stat-label">Pending Shares:</span>
            <span className="stat-value">{pendingShares}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Pool:</span>
            <span className="stat-value">{currentPool.name}</span>
          </div>
        </div>
      </div>

      {/* Shop Button */}
      <div className="shop-section">
        <button
          className="shop-btn"
          onClick={() => setShowShop(!showShop)}
        >
          🛒 Boost Shop (Telegram Stars)
        </button>
      </div>

      {/* Shop Modal */}
      {showShop && (
        <div className="shop-modal">
          <div className="shop-content">
            <div className="shop-header">
              <h3>⭐ Boost Shop</h3>
              <button className="close-btn" onClick={() => setShowShop(false)}>×</button>
            </div>
            <p className="shop-notice">
              💳 All purchases use <strong>Telegram Stars</strong><br/>
              Payment processed securely through Telegram
            </p>
            <div className="shop-items">
              {shopItems.map((item) => (
                <div key={item.id} className="shop-item">
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-desc">{item.description}</div>
                    <div className="item-effect">{item.effect}</div>
                  </div>
                  <div className="item-purchase">
                    <div className="item-price">⭐ {item.price}</div>
                    <button
                      className="purchase-btn"
                      onClick={() => handlePurchase(item)}
                    >
                      Buy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rewards */}
      <div className="rewards-section">
        <h3>💰 Your Rewards</h3>
        <div className="rewards-grid">
          <div className="reward-card">
            <div className="reward-label">MineX</div>
            <div className="reward-amount">{rewards.MineX.toFixed(2)}</div>
          </div>
          <div className="reward-card">
            <div className="reward-label">tBTC</div>
            <div className="reward-amount">{rewards.tBTC.toFixed(2)}</div>
          </div>
          <div className="reward-card">
            <div className="reward-label">MRDN</div>
            <div className="reward-amount">{rewards.MRDN.toFixed(2)}</div>
          </div>
        </div>

        {rewards.nfts.length > 0 && (
          <div className="nfts-section">
            <h4>🎨 NFT Collection</h4>
            <div className="nfts-grid">
              {rewards.nfts.map((nft, i) => (
                <div key={i} className="nft-card">
                  <div className="nft-char">{nft.character}</div>
                  <div className="nft-rarity">{nft.rarity}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="claim-section">
          <input
            type="text"
            placeholder="TON Wallet Address (UQA...)"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="wallet-input"
          />
          <button onClick={handleClaim} className="claim-btn">
            Claim Rewards
          </button>
        </div>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="stats-section">
          <h3>📊 Global Pool Stats</h3>
          <div className="global-stats">
            <div className="global-stat">
              <span>Total Miners:</span>
              <strong>{stats.totalMiners}</strong>
            </div>
            <div className="global-stat">
              <span>Blocks Found:</span>
              <strong>{stats.totalBlocksFound}</strong>
            </div>
            <div className="global-stat">
              <span>Global Hashrate:</span>
              <strong>{stats.globalHashrate.toFixed(2)} H/s</strong>
            </div>
          </div>

          <h4>Recent Blocks</h4>
          <div className="recent-blocks">
            {stats.recentBlocks.slice(0, 5).map((block, i) => (
              <div key={i} className="block-item">
                <span>#{block.height}</span>
                <span>{block.pool}</span>
                <span>{block.reward} {block.token}</span>
                {block.nft && <span>🎨</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <footer>
        <p>Powered by TON Blockchain</p>
        <p className="distribution">70% Finder + 30% Pool Distribution</p>
        <p className="legal-links">
          <a href="/terms.html" target="_blank">Terms</a> |
          <a href="/privacy.html" target="_blank">Privacy</a>
        </p>
      </footer>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
