const { useState, useEffect, useRef } = React;

// TON Connect Integration
const TON_CONNECT_MANIFEST = 'https://fas-tap-mining.vercel.app/tonconnect-manifest.json';
function App() {
  const [view, setView] = useState('mining');
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');

  // WALLET STATE - OBBLIGATORIO
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(true);
  const [tonConnectReady, setTonConnectReady] = useState(false);

  // Mining state
  const [selectedPool, setSelectedPool] = useState('minex');
  const [taps, setTaps] = useState(0);
  const [pendingShares, setPendingShares] = useState(0);
  const [rewards, setRewards] = useState({ MineX: 0, tBTC: 0, MRDN: 0 });
  const [nfts, setNfts] = useState([]);

  // REAL-TIME STATS STATE
  const [realtimeStats, setRealtimeStats] = useState({
    activeMiners: 0,
    globalHashrate: '0.00',
    blocksFoundToday: 0,
    poolStats: {},
    recentBlocks: []
  });

  const [userStats, setUserStats] = useState(null);
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [dailyReward, setDailyReward] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('blocks');
  const [autoTap, setAutoTap] = useState(null);
  const [blockFoundAnimation, setBlockFoundAnimation] = useState(null);
  const [tapAnimations, setTapAnimations] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);
  const [shopItems, setShopItems] = useState([]);
  const [activeBoosts, setActiveBoosts] = useState([]);
  const [isGod, setIsGod] = useState(false);

  const wsRef = useRef(null);
  const tonConnectUI = useRef(null);

  const pools = {
    minex: { name: 'MineX', token: 'MineX', color: '#00ff88', weight: '40%', reward: 100 },
    tbtc: { name: 'TonBitcoin', token: 'tBTC', color: '#ff9500', weight: '30%', reward: 50 },
    mrdn: { name: 'Meridian', token: 'MRDN', color: '#5856d6', weight: '30%', reward: 1000, nft: true }
  };

  // Initialize Telegram WebApp
  useEffect(() => {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();
    window.Telegram.WebApp.enableClosingConfirmation();

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    if (user) {
      setUserId(user.id);
      setUsername(user.username || user.first_name || `User${user.id}`);
    }
  }, []);

// Initialize TON Connect (PRODUCTION READY + dynamic loader)
useEffect(() => {
  let unsub = null;
  let cancelled = false;

  const loadTonConnectScript = () => {
    return new Promise((resolve, reject) => {
      // Se già presente, ok
      if (window.TonConnectUI || window.TonConnectUI?.TonConnectUI) return resolve();

      // Evita doppio script
      const existing = document.querySelector('script[data-tonconnect-ui="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('TON Connect script failed to load')));
        return;
      }

      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@tonconnect/ui@0.0.34/dist/tonconnect-ui.min.js';
      s.async = true;
      s.setAttribute('data-tonconnect-ui', '1');

      s.onload = () => resolve();
      s.onerror = () => reject(new Error('TON Connect script failed to load (network/blocked/cached)'));

      document.head.appendChild(s);
    });
  };

  const initTonConnect = async () => {
    try {
      // Stato UI: mentre carica
      setTonConnectReady(false);

      // 1) assicura script caricato
      await loadTonConnectScript();
      if (cancelled) return;

      // 2) risolvi classe UMD
      const TonConnectUIClass =
        window.TonConnectUI?.TonConnectUI ||
        window.TonConnectUI ||
        null;

      if (!TonConnectUIClass) {
        throw new Error('TonConnectUI class not found on window after script load');
      }

      // 3) istanzia UNA sola volta
      if (!tonConnectUI.current) {
        tonConnectUI.current = new TonConnectUIClass({
          manifestUrl: TON_CONNECT_MANIFEST
        });
      }

      // 4) listener
      if (typeof tonConnectUI.current.onStatusChange === 'function') {
        unsub = tonConnectUI.current.onStatusChange((wallet) => {
          const address = wallet?.account?.address || '';

          if (address) {
            setWalletAddress(address);
            setWalletConnected(true);
            setShowWalletModal(false);

            // Salva sul backend solo se userId disponibile
            if (userId) {
              fetch('/api/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, walletAddress: address })
              }).catch(() => {});
            }
          } else {
            setWalletConnected(false);
            setWalletAddress('');
            setShowWalletModal(true);
          }
        });
      }

      // 5) restore session
      const currentWallet = tonConnectUI.current.wallet;
      const currentAddress = currentWallet?.account?.address || '';
      if (currentAddress) {
        setWalletAddress(currentAddress);
        setWalletConnected(true);
        setShowWalletModal(false);
      }

      // 6) UI pronta
      setTonConnectReady(true);
    } catch (err) {
      console.error('TON Connect init error:', err);

      // IMPORTANTISSIMO: se fallisce, almeno rendi cliccabile e mostra errore user-friendly
      setTonConnectReady(false);

      // Se sei in Telegram WebApp, mostra alert leggibile
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert(
          'TON Connect non si è inizializzato. Probabile script bloccato o non caricato. Guarda console/log e riprova.'
        );
      }
    }
  };

  initTonConnect();

  return () => {
    cancelled = true;
    if (typeof unsub === 'function') unsub();
  };
}, [userId]);

  // Initialize WebSocket for REAL-TIME stats
  useEffect(() => {
    if (!walletConnected) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected - Real-time stats active');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'stats_update') {
          setRealtimeStats(message.data);
        } else if (message.type === 'block_found') {
          // Someone found a block!
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
          }
          // Reload blocks
          setRealtimeStats(prev => ({
            ...prev,
            recentBlocks: [message.data, ...prev.recentBlocks.slice(0, 9)]
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('❌ WebSocket disconnected');
      // Reconnect after 3 seconds
      setTimeout(() => {
        if (walletConnected) {
          window.location.reload();
        }
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [walletConnected]);

  // Load user data ONLY after wallet connected
  useEffect(() => {
    if (walletConnected && userId) {
      loadUserData(userId);
    }
  }, [walletConnected, userId]);

  const loadUserData = async (uid) => {
    try {
      const rewardsRes = await fetch(`/api/claim?userId=${uid}`);
      const rewardsData = await rewardsRes.json();

      if (rewardsData.success) {
        setRewards(rewardsData.rewards || { MineX: 0, tBTC: 0, MRDN: 0 });
        setNfts(rewardsData.nfts || []);
      }

      const statsRes = await fetch(`/api/stats?userId=${uid}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setUserStats(statsData.stats);
        setReferralCode(statsData.user?.referralCode || '');
        setReferralStats(statsData.referrals);
        setAchievements(statsData.achievements || []);
        setDailyReward(statsData.dailyReward);
        setAutoTap(statsData.autoTap);
      }
    } catch (error) {
      console.error('Load user data error:', error);
    }
  };

  // Connect TON Wallet - REAL
  const connectWallet = async () => {
    try {
      if (!tonConnectReady || !tonConnectUI.current) {
        window.Telegram.WebApp.showAlert('Initializing TON Connect... Please wait a moment and try again.');
        return;
      }

      await tonConnectUI.current.openModal();
    } catch (error) {
      console.error('Connect wallet error:', error);
      window.Telegram.WebApp.showAlert('Wallet connection failed: ' + error.message);
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (tonConnectUI.current) {
        await tonConnectUI.current.disconnect();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Load shop items
  const loadShop = async () => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/shop?userId=${userId}`);
      const data = await res.json();

      if (data.success) {
        setShopItems(data.items || []);
        setActiveBoosts(data.activeBoosts || []);
        setIsGod(data.isGod || false);
      }
    } catch (error) {
      console.error('Load shop error:', error);
    }
  };

  // Purchase boost item
  const purchaseItem = async (itemId) => {
    if (!userId) return;

    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }

      const res = await fetch('/api/shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          itemId: itemId,
          action: 'initiate_purchase'
        })
      });

      const data = await res.json();

      if (data.success) {
        window.Telegram.WebApp.showAlert('Invoice sent! Check Telegram to complete payment.');
        setTimeout(() => loadShop(), 2000);
      } else {
        window.Telegram.WebApp.showAlert(data.error || 'Purchase failed');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      window.Telegram.WebApp.showAlert('Purchase failed: ' + error.message);
    }
  };

  // Handle tap with haptic feedback
  const handleTap = async (e) => {
    if (!userId || !walletConnected) return;

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const animId = Date.now();
    setTapAnimations(prev => [...prev, { id: animId, x, y }]);
    setTimeout(() => {
      setTapAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1000);

    const newTaps = taps + 1;
    setTaps(newTaps);

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
        setPendingShares(data.pendingShares || 0);

        if (data.blockFound) {
          handleBlockFound(data);
        }
      }
    } catch (error) {
      console.error('Mining error:', error);
    }
  };

  const handleBlockFound = (data) => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    const pool = pools[selectedPool];
    setRewards(prev => ({
      ...prev,
      [pool.token]: prev[pool.token] + data.finderReward.amount
    }));

    setBlockFoundAnimation(data);
    setTimeout(() => setBlockFoundAnimation(null), 5000);

    if (data.newAchievements && data.newAchievements.length > 0) {
      setNewAchievement(data.newAchievements[0]);
      setTimeout(() => setNewAchievement(null), 3000);
    }

    loadUserData(userId);
  };

  const handleClaim = async () => {
    if (!walletConnected) {
      window.Telegram.WebApp.showAlert('Please connect your wallet first!');
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
        window.Telegram.WebApp.showAlert(data.message);
        setRewards({ MineX: 0, tBTC: 0, MRDN: 0 });

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        window.Telegram.WebApp.showAlert(data.error || 'Claim failed');
      }
    } catch (error) {
      window.Telegram.WebApp.showAlert('Claim error: ' + error.message);
    }
  };

  const claimDailyReward = async () => {
    try {
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId })
      });

      const data = await res.json();

      if (data.success && data.claimed) {
        window.Telegram.WebApp.showAlert(
          `🎉 Daily Reward Claimed!\n\n+${data.reward} MineX\nStreak: ${data.streak} days\nMultiplier: ${data.multiplier}x`
        );
        loadUserData(userId);

        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        window.Telegram.WebApp.showAlert(data.message || 'Already claimed today');
      }
    } catch (error) {
      console.error('Daily reward error:', error);
    }
  };

  const loadLeaderboard = async (type) => {
    try {
      const res = await fetch(`/api/stats?type=leaderboard&metric=${type}&limit=100`);
      const data = await res.json();

      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Leaderboard error:', error);
    }
  };

  useEffect(() => {
    if (view === 'leaderboard' && walletConnected) {
      loadLeaderboard(leaderboardType);
    }
  }, [view, leaderboardType, walletConnected]);

  const copyReferralLink = () => {
    const link = `https://t.me/YourBotName?start=${referralCode}`;
    navigator.clipboard.writeText(link);
    window.Telegram.WebApp.showAlert('Referral link copied!');

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  const shareReferralLink = () => {
    const link = `https://t.me/YourBotName?start=${referralCode}`;
    const text = `Join me on FasTapMining! Mine MineX, tBTC, and MRDN tokens. Use my referral code: ${referralCode}`;
    window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  const currentPool = pools[selectedPool];

  // WALLET CONNECT MODAL - OBBLIGATORIO
  if (!walletConnected && showWalletModal) {
    return (
      <div className="App">
        <div className="wallet-connect-modal">
          <div className="wallet-modal-content">
            <div className="modal-icon">🔗</div>
            <h1>Connect Your Wallet</h1>
            <p className="modal-description">
              Connect your TON wallet to start mining MineX, tBTC, and MRDN tokens
            </p>

            <div className="wallet-features">
              <div className="feature">✅ Real multi-token mining</div>
              <div className="feature">✅ Earn NFTs from blocks</div>
              <div className="feature">✅ Referral rewards</div>
              <div className="feature">✅ Daily streak bonuses</div>
            </div>

            <button
              className="connect-wallet-btn"
              onClick={connectWallet}
              disabled={!tonConnectReady}
            >
              <span className="btn-icon">💼</span>
              {tonConnectReady ? 'Connect TON Wallet' : 'Initializing...'}
            </button>

            <div className="modal-footer">
              <p>Secure connection via TON Connect</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>⚡ FasTapMining</h1>
          <div className="header-actions">
            <button
              className="wallet-btn connected"
              onClick={disconnectWallet}
            >
              ✅ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </button>
          </div>
        </div>
      </header>

      {/* REAL-TIME STATS BANNER */}
      <div className="realtime-stats-banner">
        <div className="stat-live">
          <span className="live-dot">🔴</span>
          <span className="stat-label">Active Miners:</span>
          <span className="stat-value">{realtimeStats.activeMiners}</span>
        </div>
        <div className="stat-live">
          <span className="stat-label">Hashrate:</span>
          <span className="stat-value">{realtimeStats.globalHashrate} H/s</span>
        </div>
        <div className="stat-live">
          <span className="stat-label">Blocks Today:</span>
          <span className="stat-value">{realtimeStats.blocksFoundToday}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-bar">
        <button
          className={`nav-btn ${view === 'mining' ? 'active' : ''}`}
          onClick={() => setView('mining')}
        >
          ⛏️ Mine
        </button>
        <button
          className={`nav-btn ${view === 'shop' ? 'active' : ''}`}
          onClick={() => { setView('shop'); loadShop(); }}
        >
          🛒 Shop {activeBoosts.length > 0 && <span className="badge">{activeBoosts.length}</span>}
        </button>
        <button
          className={`nav-btn ${view === 'referral' ? 'active' : ''}`}
          onClick={() => setView('referral')}
        >
          🤝 Refer
        </button>
        <button
          className={`nav-btn ${view === 'nfts' ? 'active' : ''}`}
          onClick={() => setView('nfts')}
        >
          🎨 NFTs {nfts.length > 0 && <span className="badge">{nfts.length}</span>}
        </button>
        <button
          className={`nav-btn ${view === 'achievements' ? 'active' : ''}`}
          onClick={() => setView('achievements')}
        >
          🏆 Achievements
        </button>
        <button
          className={`nav-btn ${view === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setView('leaderboard')}
        >
          👑 Top
        </button>
      </nav>

      {/* Daily Reward Banner */}
      {dailyReward && dailyReward.canClaim && (
        <div className="daily-reward-banner" onClick={claimDailyReward}>
          <div className="daily-content">
            <span className="daily-icon">🎁</span>
            <div className="daily-text">
              <div className="daily-title">Daily Reward Available!</div>
              <div className="daily-subtitle">Streak: {dailyReward.currentStreak} days</div>
            </div>
          </div>
          <button className="claim-daily-btn">Claim</button>
        </div>
      )}

      {/* AutoTap Banner */}
      {autoTap && (
        <div className="autotap-banner-compact">
          <span className="autotap-icon">
            {autoTap.tier.includes('lifetime') ? '👑' : '⚡'}
          </span>
          <div className="autotap-info-compact">
            <div className="autotap-label">AutoTap Active</div>
            <div className="autotap-value">+{autoTap.sharesPerSecond}/sec</div>
          </div>
        </div>
      )}

      {/* Mining View */}
      {view === 'mining' && (
        <div className="view mining-view">
          <div className="pool-selector-compact">
            {Object.entries(pools).map(([id, pool]) => (
              <button
                key={id}
                className={`pool-btn-compact ${selectedPool === id ? 'active' : ''}`}
                style={{ borderColor: pool.color }}
                onClick={() => setSelectedPool(id)}
              >
                <div className="pool-name">{pool.name}</div>
                <div className="pool-token">{pool.token}</div>
                {realtimeStats.poolStats[id] && (
                  <div className="pool-miners">👥 {realtimeStats.poolStats[id].activeMiners}</div>
                )}
              </button>
            ))}
          </div>

          <div
            className="tap-zone"
            style={{ background: `radial-gradient(circle, ${currentPool.color}, #00aaff)` }}
            onClick={handleTap}
          >
            <div className="tap-content">
              <div className="pool-label">{currentPool.name}</div>
              <div className="tap-label">TAP TO MINE</div>
              <div className="tap-count">{taps} taps</div>
              <div className="shares-count">{pendingShares} shares</div>
            </div>

            {tapAnimations.map(anim => (
              <div
                key={anim.id}
                className="tap-animation"
                style={{ left: anim.x, top: anim.y }}
              >
                +1
              </div>
            ))}
          </div>

          <div className="rewards-compact">
            <h3>💰 Your Balance</h3>
            <div className="rewards-grid">
              <div className="reward-card-compact">
                <div className="reward-label">MineX</div>
                <div className="reward-amount">{rewards.MineX.toFixed(2)}</div>
              </div>
              <div className="reward-card-compact">
                <div className="reward-label">tBTC</div>
                <div className="reward-amount">{rewards.tBTC.toFixed(4)}</div>
              </div>
              <div className="reward-card-compact">
                <div className="reward-label">MRDN</div>
                <div className="reward-amount">{rewards.MRDN.toFixed(2)}</div>
              </div>
            </div>

            <button className="claim-btn-main" onClick={handleClaim}>
              Claim Rewards
            </button>
          </div>

          {realtimeStats.recentBlocks.length > 0 && (
            <div className="recent-blocks-compact">
              <h3>🆕 Recent Blocks (Live)</h3>
              {realtimeStats.recentBlocks.slice(0, 5).map((block, i) => (
                <div key={i} className="block-item-compact">
                  <span className="block-height">#{block.height}</span>
                  <span className="block-pool">{block.pool}</span>
                  <span className="block-reward">{block.reward} {block.token}</span>
                  {block.nft && <span className="block-nft">🎨</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Other views same as before... */}
      {view === 'referral' && (
        <div className="view referral-view">
          <h2>🤝 Invite Friends</h2>
          <div className="referral-card">
            <div className="referral-code-section">
              <div className="referral-label">Your Referral Code</div>
              <div className="referral-code">{referralCode}</div>
              <div className="referral-actions">
                <button className="copy-btn" onClick={copyReferralLink}>📋 Copy Link</button>
                <button className="share-btn" onClick={shareReferralLink}>📤 Share</button>
              </div>
            </div>

            {referralStats && (
              <div className="referral-stats">
                <div className="ref-stat">
                  <div className="ref-value">{referralStats.total || 0}</div>
                  <div className="ref-label">Total Referrals</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-value">{referralStats.active || 0}</div>
                  <div className="ref-label">Active</div>
                </div>
                <div className="ref-stat">
                  <div className="ref-value">{referralStats.totalEarned?.toFixed(2) || 0}</div>
                  <div className="ref-label">Earned</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'nfts' && (
        <div className="view nfts-view">
          <h2>🎨 NFT Collection</h2>
          {nfts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎨</div>
              <p>No NFTs yet</p>
              <p className="empty-subtitle">Mine Meridian pool blocks to earn NFTs!</p>
            </div>
          ) : (
            <div className="nfts-grid">
              {nfts.map((nft, i) => (
                <div key={i} className="nft-card">
                  <div className="nft-image-placeholder">
                    <span className="nft-char">{nft.character}</span>
                  </div>
                  <div className="nft-info">
                    <div className="nft-name">{nft.character}</div>
                    <div className={`nft-rarity rarity-${nft.rarity.toLowerCase()}`}>{nft.rarity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'achievements' && (
        <div className="view achievements-view">
          <h2>🏆 Achievements</h2>
          <div className="achievements-grid">
            {achievements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <p>No achievements yet</p>
              </div>
            ) : (
              achievements.map((achievement, i) => (
                <div key={i} className="achievement-card unlocked">
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                    <div className="achievement-date">
                      Earned: {new Date(achievement.earned).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {view === 'leaderboard' && (
        <div className="view leaderboard-view">
          <h2>👑 Leaderboard</h2>
          <div className="leaderboard-tabs">
            <button
              className={leaderboardType === 'blocks' ? 'active' : ''}
              onClick={() => setLeaderboardType('blocks')}
            >
              Blocks
            </button>
            <button
              className={leaderboardType === 'taps' ? 'active' : ''}
              onClick={() => setLeaderboardType('taps')}
            >
              Taps
            </button>
            <button
              className={leaderboardType === 'referrals' ? 'active' : ''}
              onClick={() => setLeaderboardType('referrals')}
            >
              Referrals
            </button>
          </div>

          <div className="leaderboard-list">
            {leaderboard.map((entry, i) => (
              <div
                key={i}
                className={`leaderboard-entry ${entry.userId === userId ? 'current-user' : ''}`}
              >
                <div className="rank">
                  {entry.rank <= 3 ? (
                    <span className={`medal medal-${entry.rank}`}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                    </span>
                  ) : (
                    <span className="rank-number">#{entry.rank}</span>
                  )}
                </div>
                <div className="username">{entry.username}</div>
                <div className="value">{entry.value.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'shop' && (
        <div className="view shop-view">
          <h2>🛒 Boost Shop</h2>
          {isGod && (
            <div className="god-mode-banner">
              👑 GOD MODE - All items FREE for you!
            </div>
          )}

          {activeBoosts.length > 0 && (
            <div className="active-boosts-section">
              <h3>⚡ Active Boosts</h3>
              <div className="active-boosts-list">
                {activeBoosts.map((boost, i) => (
                  <div key={i} className="active-boost-item">
                    <span className="boost-name">{boost.boost_name}</span>
                    <span className="boost-effect">{boost.effect}</span>
                    <span className="boost-expires">
                      Expires: {new Date(boost.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="shop-categories">
            <h3>🤖 AutoTap Subscriptions</h3>
            <div className="shop-grid">
              {shopItems.filter(item => item.category === 'autotap').map((item, i) => (
                <div key={i} className={`shop-item ${item.popular ? 'popular' : ''} ${item.bestValue ? 'best-value' : ''} ${item.alreadyOwned ? 'owned' : ''}`}>
                  {item.popular && <div className="badge-popular">POPULAR</div>}
                  {item.bestValue && <div className="badge-best">BEST VALUE</div>}
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                  <div className="item-effect">{item.effect}</div>
                  <div className="item-price">
                    {isGod ? (
                      <span className="price-free">FREE</span>
                    ) : (
                      <span className="price-stars">⭐ {item.price} Stars</span>
                    )}
                  </div>
                  {item.alreadyOwned ? (
                    <button className="btn-owned" disabled>✓ Owned</button>
                  ) : (
                    <button
                      className="btn-buy"
                      onClick={() => purchaseItem(item.id)}
                    >
                      {isGod ? 'Activate FREE' : 'Buy Now'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <h3>⚡ Tap Boosts</h3>
            <div className="shop-grid">
              {shopItems.filter(item => item.category === 'boost').map((item, i) => (
                <div key={i} className={`shop-item ${item.alreadyOwned ? 'owned' : ''}`}>
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                  <div className="item-effect">{item.effect}</div>
                  <div className="item-price">
                    {isGod ? (
                      <span className="price-free">FREE</span>
                    ) : (
                      <span className="price-stars">⭐ {item.price} Stars</span>
                    )}
                  </div>
                  {item.alreadyOwned ? (
                    <button className="btn-owned" disabled>✓ Owned</button>
                  ) : (
                    <button
                      className="btn-buy"
                      onClick={() => purchaseItem(item.id)}
                    >
                      {isGod ? 'Activate FREE' : 'Buy Now'}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <h3>👑 Premium Pass</h3>
            <div className="shop-grid">
              {shopItems.filter(item => item.category === 'premium').map((item, i) => (
                <div key={i} className={`shop-item premium ${item.alreadyOwned ? 'owned' : ''}`}>
                  <div className="item-icon">{item.icon}</div>
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                  <div className="item-effect">{item.effect}</div>
                  <div className="item-price">
                    {isGod ? (
                      <span className="price-free">FREE</span>
                    ) : (
                      <span className="price-stars">⭐ {item.price} Stars</span>
                    )}
                  </div>
                  {item.alreadyOwned ? (
                    <button className="btn-owned" disabled>✓ Owned</button>
                  ) : (
                    <button
                      className="btn-buy"
                      onClick={() => purchaseItem(item.id)}
                    >
                      {isGod ? 'Activate FREE' : 'Buy Now'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="shop-info">
            <p>💳 All purchases are made with Telegram Stars</p>
            <p>⚡ Boosts activate instantly after payment</p>
            <p>🔄 Subscriptions auto-expire at end of period</p>
          </div>
        </div>
      )}

      {blockFoundAnimation && (
        <div className="modal-overlay" onClick={() => setBlockFoundAnimation(null)}>
          <div className="block-found-modal">
            <div className="confetti">🎉</div>
            <h1>BLOCK FOUND!</h1>
            <div className="block-details">
              <p>Pool: {blockFoundAnimation.pool}</p>
              <p>Block #{blockFoundAnimation.blockHeight}</p>
              <h2>+{blockFoundAnimation.finderReward.amount} {blockFoundAnimation.finderReward.token}</h2>
              {blockFoundAnimation.nftReward && (
                <div className="nft-reward">
                  <p>🎨 NFT Bonus!</p>
                  <p>{blockFoundAnimation.nftReward.character} ({blockFoundAnimation.nftReward.rarity})</p>
                </div>
              )}
            </div>
            <button className="continue-btn" onClick={() => setBlockFoundAnimation(null)}>
              Continue Mining
            </button>
          </div>
        </div>
      )}

      {newAchievement && (
        <div className="achievement-toast">
          <div className="toast-icon">{newAchievement.icon}</div>
          <div className="toast-text">
            <div className="toast-title">Achievement Unlocked!</div>
            <div className="toast-subtitle">{newAchievement.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
