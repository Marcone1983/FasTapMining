const { useState, useEffect, useRef } = React;

// ============================================
// PRODUCTION CONFIGURATION - 8 REAL COINS
// ============================================

const TON_CONNECT_MANIFEST = 'https://fas-tap-mining.vercel.app/tonconnect-manifest.json';
const API_BASE = window.location.origin;

// 8 REAL SCRYPT COINS FROM VIABTC POOL
const REAL_COINS = {
  LTC: {
    name: 'Litecoin',
    symbol: 'LTC',
    color: '#345D9D',
    gradient: 'linear-gradient(135deg, #345D9D 0%, #5B8DC4 100%)',
    icon: '⚡',
    priority: 1,
    poolShare: 25 // % of mining power
  },
  DOGE: {
    name: 'Dogecoin',
    symbol: 'DOGE',
    color: '#C2A633',
    gradient: 'linear-gradient(135deg, #C2A633 0%, #F0D04C 100%)',
    icon: '🐕',
    priority: 1,
    poolShare: 25
  },
  TON: {
    name: 'Toncoin',
    symbol: 'TON',
    color: '#0088CC',
    gradient: 'linear-gradient(135deg, #0088CC 0%, #00AAFF 100%)',
    icon: '💎',
    priority: 1,
    poolShare: 15
  },
  BELLS: {
    name: 'Bellscoin',
    symbol: 'BELLS',
    color: '#FF6B35',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF8C5F 100%)',
    icon: '🔔',
    priority: 2,
    poolShare: 10
  },
  LKY: {
    name: 'Luckycoin',
    symbol: 'LKY',
    color: '#4CAF50',
    gradient: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
    icon: '🍀',
    priority: 2,
    poolShare: 10
  },
  PEP: {
    name: 'Pepecoin',
    symbol: 'PEP',
    color: '#00C853',
    gradient: 'linear-gradient(135deg, #00C853 0%, #00E676 100%)',
    icon: '🐸',
    priority: 2,
    poolShare: 5
  },
  JKC: {
    name: 'Junkcoin',
    symbol: 'JKC',
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
    icon: '🗑️',
    priority: 2,
    poolShare: 5
  },
  DINGO: {
    name: 'Dingocoin',
    symbol: 'DINGO',
    color: '#FF9800',
    gradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
    icon: '🦴',
    priority: 2,
    poolShare: 5
  }
};

// Initialize all balances to 0
const INITIAL_BALANCES = Object.keys(REAL_COINS).reduce((acc, coin) => {
  acc[coin] = 0;
  return acc;
}, {});

function App() {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [view, setView] = useState('mining');
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');

  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(true);
  const [tonConnectReady, setTonConnectReady] = useState(false);
  const [manualWalletMode, setManualWalletMode] = useState(false);
  const [manualWalletInput, setManualWalletInput] = useState('');
  const [hasLifetimeAccess, setHasLifetimeAccess] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Mining state
  const [taps, setTaps] = useState(0);
  const [pendingShares, setPendingShares] = useState(0);
  const [balances, setBalances] = useState(INITIAL_BALANCES);
  const [hashrate, setHashrate] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);

  // Real-time stats
  const [realtimeStats, setRealtimeStats] = useState({
    activeMiners: 0,
    globalHashrate: '0.00',
    blocksFoundToday: 0,
    poolEfficiency: 100,
    networkDifficulty: 0,
    recentBlocks: []
  });

  // Portfolio value
  const [portfolioValueUSD, setPortfolioValueUSD] = useState(0);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [priceChange24h, setPriceChange24h] = useState({});

  // User stats
  const [userStats, setUserStats] = useState({
    totalTaps: 0,
    totalShares: 0,
    blocksFound: 0,
    miningDays: 0,
    rank: 0,
    hashrateHistory: []
  });

  // Referral
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0, earned: 0 });

  // Achievements
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);

  // Marketplace
  const [shopItems, setShopItems] = useState([]);
  const [activeBoosts, setActiveBoosts] = useState([]);

  // UI state
  const [tapAnimations, setTapAnimations] = useState([]);
  const [showBlockFound, setShowBlockFound] = useState(null);
  const [showNotification, setShowNotification] = useState(null);
  const [particlesEnabled, setParticlesEnabled] = useState(true);

  // Refs
  const wsRef = useRef(null);
  const tonConnectUIRef = useRef(null);
  const tonConnectUnsubRef = useRef(null);
  const tonConnectInitRef = useRef(false);
  const canvasRef = useRef(null);

  // ============================================
  // TELEGRAM WEBAPP INITIALIZATION
  // ============================================

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    try {
      tg.ready();
      tg.expand();
      tg.enableClosingConfirmation();
      tg.setBackgroundColor('#0a0e1a');
      tg.setHeaderColor('#0a0e1a');

      const user = tg.initDataUnsafe?.user;
      if (user) {
        setUserId(user.id);
        setUsername(user.username || user.first_name || `User${user.id}`);
      } else {
        // Development fallback
        setUserId(Math.floor(Math.random() * 1000000));
        setUsername('DevUser');
      }
    } catch (e) {
      console.error('Telegram WebApp init error:', e);
    }
  }, []);

  // ============================================
  // TON CONNECT INITIALIZATION
  // ============================================

  useEffect(() => {
    if (tonConnectInitRef.current) return;
    tonConnectInitRef.current = true;

    let cancelled = false;

    const init = async () => {
      try {
        setTonConnectReady(false);

        let attempts = 0;
        while (!window.TON_CONNECT_UI && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.TON_CONNECT_UI) {
          throw new Error('TON Connect UI failed to load');
        }

        tonConnectUIRef.current = new window.TON_CONNECT_UI.TonConnectUI({
          manifestUrl: TON_CONNECT_MANIFEST
        });

        if (typeof tonConnectUIRef.current.onStatusChange === 'function') {
          tonConnectUnsubRef.current = tonConnectUIRef.current.onStatusChange(async (wallet) => {
            const address = wallet?.account?.address;

            if (address) {
              setWalletAddress(address);
              setWalletConnected(true);
              setShowWalletModal(false);
              showNotif('Wallet connected successfully!', 'success');

              // OWNER WALLET - AUTO CHECK FOR FREE ACCESS
              const OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
              const normalizedAddress = address.replace(/\s/g, '').toUpperCase();
              const normalizedOwner = OWNER_WALLET.replace(/\s/g, '').toUpperCase();

              if (normalizedAddress === normalizedOwner && userId && !hasLifetimeAccess) {
                // Owner wallet connected - auto-check for free access
                try {
                  const res = await fetch(`${API_BASE}/api/user/check-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, walletAddress: address })
                  });

                  const data = await res.json();

                  if (data.success && data.hasLifetimeAccess) {
                    setHasLifetimeAccess(true);
                    showNotif('👑 Owner Access Activated - Mine FREE Forever!', 'success');
                  }
                } catch (error) {
                  console.error('Owner auto-check error:', error);
                }
              }
            } else {
              setWalletConnected(false);
              setWalletAddress('');
              setShowWalletModal(true);
            }
          });
        }

        const currentWallet = tonConnectUIRef.current.wallet;
        const currentAddress = currentWallet?.account?.address;

        if (currentAddress) {
          setWalletAddress(currentAddress);
          setWalletConnected(true);
          setShowWalletModal(false);

          // OWNER WALLET - AUTO CHECK FOR FREE ACCESS (on page load with already connected wallet)
          const OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
          const normalizedAddress = currentAddress.replace(/\s/g, '').toUpperCase();
          const normalizedOwner = OWNER_WALLET.replace(/\s/g, '').toUpperCase();

          if (normalizedAddress === normalizedOwner && userId && !hasLifetimeAccess) {
            // Owner wallet already connected - auto-check for free access
            setTimeout(async () => {
              try {
                const res = await fetch(`${API_BASE}/api/user/check-payment`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId, walletAddress: currentAddress })
                });

                const data = await res.json();

                if (data.success && data.hasLifetimeAccess) {
                  setHasLifetimeAccess(true);
                  showNotif('👑 Owner Access Activated - Mine FREE Forever!', 'success');
                }
              } catch (error) {
                console.error('Owner auto-check error:', error);
              }
            }, 1000);
          }
        }

        if (tonConnectUIRef.current.connectionRestored) {
          tonConnectUIRef.current.connectionRestored.catch(() => {});
        }

        if (!cancelled) setTonConnectReady(true);
      } catch (err) {
        console.error('TON Connect init error:', err);
        if (!cancelled) setTonConnectReady(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      try {
        if (typeof tonConnectUnsubRef.current === 'function') tonConnectUnsubRef.current();
      } catch (_) {}
    };
  }, []);

  // ============================================
  // CHECK INITIAL LIFETIME ACCESS STATUS
  // ============================================

  useEffect(() => {
    // Check if user already has lifetime access when userId and wallet are available
    if (!userId || !walletAddress || hasLifetimeAccess) return;

    const checkInitialAccess = async () => {
      try {
        console.log('🔍 CHECKING OWNER ACCESS:', {
          userId,
          walletAddress,
          ownerWallet: 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR'
        });

        const res = await fetch(`${API_BASE}/api/user/check-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, walletAddress })
        });

        const data = await res.json();
        console.log('✅ OWNER CHECK RESPONSE:', data);

        if (data.success && data.hasLifetimeAccess) {
          setHasLifetimeAccess(true);
          if (data.ownerAccess) {
            showNotif('👑 Owner Access Activated - Mine FREE Forever!', 'success');
          } else {
            showNotif('✅ Lifetime Access Active - Mine Forever!', 'success');
          }
        }
      } catch (error) {
        console.error('Initial access check error:', error);
      }
    };

    checkInitialAccess();
  }, [userId, walletAddress, hasLifetimeAccess]);

  // ============================================
  // WEBSOCKET REAL-TIME STATS
  // ============================================

  useEffect(() => {
    if (!walletConnected) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'stats_update') {
          setRealtimeStats(message.data);
        } else if (message.type === 'block_found') {
          handleBlockFoundEvent(message.data);
        } else if (message.type === 'price_update') {
          setCryptoPrices(message.data.prices);
          setPriceChange24h(message.data.changes);
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
      setTimeout(() => {
      // Reconnection handled by React state
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      } catch (_) {}
    };
  }, [walletConnected]);

  // ============================================
  // LOAD USER DATA
  // ============================================

  useEffect(() => {
    if (walletConnected && userId) {
      loadUserData();
      loadCryptoPrices();
    }
  }, [walletConnected, userId]);

  const loadUserData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/user/data?userId=${userId}`);
      const data = await res.json();

      if (data.success) {
        setBalances(data.balances || INITIAL_BALANCES);
        setHashrate(data.hashrate || 0);
        setTotalEarnings(data.totalEarnings || 0);
        setUserStats(data.stats || userStats);
        setReferralCode(data.referralCode || '');
        setReferralStats(data.referralStats || referralStats);
        setAchievements(data.achievements || []);
        setActiveBoosts(data.activeBoosts || []);
        setHasLifetimeAccess(data.hasLifetimeAccess || false);
      }
    } catch (error) {
      console.error('Load user data error:', error);
    }
  };

  const loadCryptoPrices = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/prices`);
      const data = await res.json();

      if (data.success) {
        setCryptoPrices(data.prices);
        setPriceChange24h(data.changes24h);
        calculatePortfolioValue(data.prices);
      }
    } catch (error) {
      console.error('Load prices error:', error);
    }
  };

  const calculatePortfolioValue = (prices) => {
    let totalUSD = 0;
    Object.entries(balances).forEach(([coin, amount]) => {
      if (prices[coin]) {
        totalUSD += amount * prices[coin];
      }
    });
    setPortfolioValueUSD(totalUSD);
  };

  // Recalculate portfolio when balances or prices change
  useEffect(() => {
    if (Object.keys(cryptoPrices).length > 0) {
      calculatePortfolioValue(cryptoPrices);
    }
  }, [balances, cryptoPrices]);

  // ============================================
  // WALLET FUNCTIONS
  // ============================================

  const connectWallet = async () => {
    try {
      if (!tonConnectReady || !tonConnectUIRef.current) {
        showNotif('Initializing TON Connect...', 'info');
        return;
      }

      if (typeof tonConnectUIRef.current.openModal === 'function') {
        await tonConnectUIRef.current.openModal();
      } else if (typeof tonConnectUIRef.current.connectWallet === 'function') {
        await tonConnectUIRef.current.connectWallet();
      }
    } catch (error) {
      console.error('Connect wallet error:', error);
      showNotif('Wallet connection failed', 'error');
    }
  };

  const disconnectWallet = async () => {
    try {
      if (tonConnectUIRef.current?.disconnect) {
        await tonConnectUIRef.current.disconnect();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    setWalletConnected(false);
    setWalletAddress('');
    setShowWalletModal(true);
  };

  const connectWalletManually = async () => {
    const address = manualWalletInput.trim();

    if (!address || (!address.startsWith('UQ') && !address.startsWith('EQ'))) {
      showNotif('Invalid TON address format', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/user/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, walletAddress: address })
      });

      if (response.ok) {
        setWalletAddress(address);
        setWalletConnected(true);
        setShowWalletModal(false);
        setManualWalletMode(false);
        setManualWalletInput('');
        showNotif('Wallet connected!', 'success');
      }
    } catch (error) {
      console.error('Manual wallet save error:', error);
      showNotif('Failed to save wallet', 'error');
    }
  };

  // ============================================
  // LIFETIME ACCESS / PAYMENT
  // ============================================

  const unlockMining = async () => {
    if (!walletAddress) {
      showNotif('Connect wallet first!', 'error');
      return;
    }

    setCheckingPayment(true);

    try {
      // Send 1 TON payment transaction via TON Connect
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR', // Owner wallet
            amount: '1000000000' // 1 TON in nanotons
            // No payload - TON Connect validates payload format strictly
          }
        ]
      };

      await tonConnectUIRef.current.sendTransaction(transaction);

      showNotif('Payment sent! Verifying...', 'info');

      // Wait 3 seconds then check payment
      setTimeout(async () => {
        const res = await fetch(`${API_BASE}/api/user/check-payment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, walletAddress })
        });

        const data = await res.json();

        if (data.success && data.hasLifetimeAccess) {
          setHasLifetimeAccess(true);
          showNotif('✅ Mining Unlocked Forever!', 'success');
        } else {
          showNotif('Payment verification pending...', 'info');
        }

        setCheckingPayment(false);
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);

      let errorMessage = 'Payment failed or cancelled';
      if (error.message) {
        if (error.message.includes('reject')) {
          errorMessage = 'Payment cancelled by user';
        } else if (error.message.includes('insufficient')) {
          errorMessage = 'Insufficient TON balance';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      showNotif(errorMessage, 'error');
      setCheckingPayment(false);
    }
  };

  // ============================================
  // MINING FUNCTIONS
  // ============================================

  const handleTap = async (e) => {
    if (!userId) return;

    hapticFeedback('light');

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const animId = Date.now() + Math.random();
    setTapAnimations(prev => [...prev, { id: animId, x, y }]);
    setTimeout(() => {
      setTapAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1000);

    const newTaps = taps + 1;
    setTaps(newTaps);

    try {
      const res = await fetch(`${API_BASE}/api/mining`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          taps: newTaps,
          poolId: 1,
          nonce: Math.floor(Math.random() * 1000000)
        })
      });

      const data = await res.json();

      if (data.success) {
        setPendingShares(data.pendingShares || 0);
        setHashrate(data.hashrate || 0);
        if (data.stats) {
          setRealtimeStats(prev => ({
            ...prev,
            activeMiners: data.stats.activeMiners,
            globalHashrate: data.stats.globalHashrate,
            blocksFoundToday: data.stats.blocksFoundToday
          }));
        }

        if (data.rewards) {
          setBalances(prev => {
            const updated = { ...prev };
            Object.entries(data.rewards).forEach(([coin, amount]) => {
              updated[coin] = (updated[coin] || 0) + amount;
            });
            return updated;
          });
        }

        if (data.blockFound) {
          handleBlockFound(data);
        }
      }
    } catch (error) {
      console.error('Mining error:', error);
    }
  };

  const handleBlockFound = (data) => {
    hapticFeedback('success');
    setShowBlockFound(data);
    setTimeout(() => setShowBlockFound(null), 5000);

    if (data.newAchievements?.length > 0) {
      setNewAchievement(data.newAchievements[0]);
      setTimeout(() => setNewAchievement(null), 3000);
    }

    loadUserData();
  };

  const handleBlockFoundEvent = (data) => {
    hapticFeedback('warning');
    showNotif(`New block found! +${data.reward} ${data.coin}`, 'success');
    setRealtimeStats(prev => ({
      ...prev,
      recentBlocks: [data, ...prev.recentBlocks.slice(0, 9)]
    }));
  };

  const handleClaim = async () => {
    if (!walletConnected) {
      showNotif('Please connect wallet first!', 'error');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, walletAddress })
      });

      const data = await res.json();

      if (data.success) {
        showNotif(data.message || 'Rewards claimed successfully!', 'success');
        setBalances(INITIAL_BALANCES);
        hapticFeedback('success');
      } else {
        showNotif(data.error || 'Claim failed', 'error');
      }
    } catch (error) {
      showNotif('Claim error', 'error');
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  const hapticFeedback = (type = 'light') => {
    const tg = window.Telegram?.WebApp;
    if (!tg?.HapticFeedback) return;

    switch (type) {
      case 'light':
        tg.HapticFeedback.impactOccurred('light');
        break;
      case 'medium':
        tg.HapticFeedback.impactOccurred('medium');
        break;
      case 'heavy':
        tg.HapticFeedback.impactOccurred('heavy');
        break;
      case 'success':
        tg.HapticFeedback.notificationOccurred('success');
        break;
      case 'warning':
        tg.HapticFeedback.notificationOccurred('warning');
        break;
      case 'error':
        tg.HapticFeedback.notificationOccurred('error');
        break;
    }
  };

  const showNotif = (message, type = 'info') => {
    setShowNotification({ message, type });
    setTimeout(() => setShowNotification(null), 3000);
  };

  const copyReferralLink = () => {
    const link = `https://t.me/FasTapMiningBot?start=${referralCode}`;
    navigator.clipboard.writeText(link);
    showNotif('Referral link copied!', 'success');
    hapticFeedback('success');
  };

  const formatNumber = (num, decimals = 8) => {
    if (num === 0) return '0.00';
    if (num < 0.0001) return num.toExponential(2);
    if (num < 1) return num.toFixed(decimals);
    if (num < 1000) return num.toFixed(2);
    if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
    return (num / 1000000).toFixed(2) + 'M';
  };

  const formatCurrency = (amount) => {
    if (amount < 1) return `$${amount.toFixed(4)}`;
    if (amount < 1000) return `$${amount.toFixed(2)}`;
    if (amount < 1000000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${(amount / 1000000).toFixed(2)}M`;
  };

  // ============================================
  // WALLET CONNECT MODAL
  // ============================================

  if (!walletConnected && showWalletModal) {
    return (
      <div className="App">
        <div className="wallet-connect-modal">
          <div className="wallet-modal-content glassmorphic">
            <div className="modal-icon-lg">💎</div>
            <h1 className="gradient-text">Connect Your Wallet</h1>
            <p className="modal-description">
              Start mining 8 real cryptocurrencies from ViaBTC pool
            </p>

            <div className="wallet-features">
              {Object.values(REAL_COINS).slice(0, 4).map(coin => (
                <div key={coin.symbol} className="feature-coin">
                  <span className="coin-icon">{coin.icon}</span>
                  <span className="coin-name">{coin.symbol}</span>
                </div>
              ))}
            </div>

            <div className="features-grid">
              <div className="feature-item">
                <span className="feature-icon">⛏️</span>
                <span className="feature-text">Real mining rewards</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span className="feature-text">Your taps = Hashrate</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <span className="feature-text">Instant withdrawals</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔒</span>
                <span className="feature-text">Secure & verified</span>
              </div>
            </div>

            {!manualWalletMode ? (
              <>
                <button
                  className="connect-wallet-btn primary-gradient"
                  onClick={connectWallet}
                  disabled={!tonConnectReady}
                >
                  <span className="btn-icon">🔗</span>
                  {tonConnectReady ? 'Connect with TON Connect' : 'Loading...'}
                </button>

                <div className="divider">OR</div>

                <button
                  className="manual-wallet-btn secondary-gradient"
                  onClick={() => setManualWalletMode(true)}
                >
                  <span className="btn-icon">✍️</span>
                  Enter Address Manually
                </button>
              </>
            ) : (
              <div className="manual-wallet-form">
                <input
                  type="text"
                  className="wallet-input glassmorphic"
                  placeholder="UQ... or EQ..."
                  value={manualWalletInput}
                  onChange={(e) => setManualWalletInput(e.target.value)}
                />
                <button className="save-wallet-btn primary-gradient" onClick={connectWalletManually}>
                  Save Wallet
                </button>
                <button className="back-btn" onClick={() => setManualWalletMode(false)}>
                  ← Back
                </button>
              </div>
            )}

            <div className="modal-footer">
              <p>✨ Powered by ViaBTC Mining Pool</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN APP RENDER
  // ============================================

  return (
    <div className="App">
      {/* Header */}
      <header className="header glassmorphic">
        <div className="header-content">
          <h1 className="gradient-text">⚡ FasTap Mining</h1>
          <button className="wallet-btn connected" onClick={disconnectWallet}>
            <span className="wallet-indicator"></span>
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </button>
        </div>
      </header>

      {/* Real-time Stats Banner */}
      <div className="realtime-stats-banner glassmorphic">
        <div className="stat-item">
          <span className="stat-icon live-pulse">🔴</span>
          <span className="stat-label">Miners</span>
          <span className="stat-value">{realtimeStats.activeMiners}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">⚡</span>
          <span className="stat-label">Hashrate</span>
          <span className="stat-value">{realtimeStats.globalHashrate} H/s</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📦</span>
          <span className="stat-label">Blocks</span>
          <span className="stat-value">{realtimeStats.blocksFoundToday}</span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">💰</span>
          <span className="stat-label">Portfolio</span>
          <span className="stat-value">{formatCurrency(portfolioValueUSD)}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="nav-bar">
        <button className={`nav-btn ${view === 'mining' ? 'active' : ''}`} onClick={() => setView('mining')}>
          <span className="nav-icon">⛏️</span>
          <span className="nav-label">Mine</span>
        </button>
        <button className={`nav-btn ${view === 'portfolio' ? 'active' : ''}`} onClick={() => setView('portfolio')}>
          <span className="nav-icon">💰</span>
          <span className="nav-label">Portfolio</span>
        </button>
        <button className={`nav-btn ${view === 'analytics' ? 'active' : ''}`} onClick={() => setView('analytics')}>
          <span className="nav-icon">📊</span>
          <span className="nav-label">Analytics</span>
        </button>
        <button className={`nav-btn ${view === 'referral' ? 'active' : ''}`} onClick={() => setView('referral')}>
          <span className="nav-icon">🤝</span>
          <span className="nav-label">Refer</span>
          {referralStats.total > 0 && <span className="badge">{referralStats.total}</span>}
        </button>
        <button className={`nav-btn ${view === 'achievements' ? 'active' : ''}`} onClick={() => setView('achievements')}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Rewards</span>
          {achievements.length > 0 && <span className="badge">{achievements.length}</span>}
        </button>
      </nav>

      {/* Active Boosts Banner */}
      {activeBoosts.length > 0 && (
        <div className="active-boosts-banner glassmorphic">
          <span className="boost-icon">⚡</span>
          <span className="boost-text">
            {activeBoosts.length} boost{activeBoosts.length > 1 ? 's' : ''} active
          </span>
        </div>
      )}

      {/* Mining View */}
      {view === 'mining' && (
        <div className="view mining-view">

          {/* Mining interface - always accessible */}
          <div
            className="tap-zone glassmorphic"
            onClick={handleTap}
            style={{
              background: 'radial-gradient(circle, rgba(0,200,255,0.3) 0%, rgba(0,100,255,0.1) 100%)'
            }}
          >
            <div className="tap-content">
              <div className="mining-label gradient-text">TAP TO MINE</div>
              <div className="tap-stats">
                <div className="tap-stat">
                  <span className="stat-num">{formatNumber(taps, 0)}</span>
                  <span className="stat-label-sm">Total Taps</span>
                </div>
                <div className="tap-stat">
                  <span className="stat-num">{formatNumber(hashrate, 2)}</span>
                  <span className="stat-label-sm">H/s</span>
                </div>
                <div className="tap-stat">
                  <span className="stat-num">{pendingShares}</span>
                  <span className="stat-label-sm">Shares</span>
                </div>
              </div>
            </div>

            {tapAnimations.map(anim => (
              <div key={anim.id} className="tap-animation" style={{ left: anim.x, top: anim.y }}>
                +1
              </div>
            ))}
          </div>

          <div className="mining-info glassmorphic">
            <h3>⛏️ Mining 8 Cryptocurrencies</h3>
            <div className="coins-grid">
              {Object.values(REAL_COINS).map(coin => (
                <div key={coin.symbol} className="coin-item" style={{ background: coin.gradient }}>
                  <span className="coin-icon-lg">{coin.icon}</span>
                  <span className="coin-name">{coin.symbol}</span>
                  <span className="coin-amount">{formatNumber(balances[coin.symbol] || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          <button className="claim-btn primary-gradient" onClick={handleClaim}>
            <span className="btn-icon">💰</span>
            Claim All Rewards
          </button>

          {realtimeStats.recentBlocks.length > 0 && (
            <div className="recent-blocks glassmorphic">
              <h3>🆕 Recent Blocks</h3>
              {realtimeStats.recentBlocks.slice(0, 5).map((block, i) => (
                <div key={i} className="block-item">
                  <span className="block-height">#{block.height}</span>
                  <span className="block-coin">{block.coin}</span>
                  <span className="block-reward">{formatNumber(block.reward)} {block.coin}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Portfolio View */}
      {view === 'portfolio' && (
        <div className="view portfolio-view">
          <div className="portfolio-header glassmorphic">
            <div className="portfolio-total">
              <div className="total-label">Total Portfolio Value</div>
              <div className="total-value gradient-text">{formatCurrency(portfolioValueUSD)}</div>
            </div>
          </div>

          <div className="portfolio-list">
            {Object.entries(REAL_COINS).map(([symbol, coin]) => {
              const balance = balances[symbol] || 0;
              const price = cryptoPrices[symbol] || 0;
              const value = balance * price;
              const change = priceChange24h[symbol] || 0;

              return (
                <div key={symbol} className="portfolio-item glassmorphic">
                  <div className="coin-info">
                    <span className="coin-icon-lg">{coin.icon}</span>
                    <div className="coin-details">
                      <div className="coin-name">{coin.name}</div>
                      <div className="coin-symbol">{symbol}</div>
                    </div>
                  </div>
                  <div className="coin-values">
                    <div className="coin-balance">{formatNumber(balance)}</div>
                    <div className="coin-value-usd">{formatCurrency(value)}</div>
                    <div className={`coin-change ${change >= 0 ? 'positive' : 'negative'}`}>
                      {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="view analytics-view">
          <h2 className="gradient-text">📊 Mining Analytics</h2>

          <div className="stats-grid">
            <div className="stat-card glassmorphic">
              <div className="stat-icon">⛏️</div>
              <div className="stat-info">
                <div className="stat-value">{formatNumber(userStats.totalTaps, 0)}</div>
                <div className="stat-label">Total Taps</div>
              </div>
            </div>
            <div className="stat-card glassmorphic">
              <div className="stat-icon">📦</div>
              <div className="stat-info">
                <div className="stat-value">{userStats.totalShares}</div>
                <div className="stat-label">Shares Submitted</div>
              </div>
            </div>
            <div className="stat-card glassmorphic">
              <div className="stat-icon">💎</div>
              <div className="stat-info">
                <div className="stat-value">{userStats.blocksFound}</div>
                <div className="stat-label">Blocks Found</div>
              </div>
            </div>
            <div className="stat-card glassmorphic">
              <div className="stat-icon">📅</div>
              <div className="stat-info">
                <div className="stat-value">{userStats.miningDays}</div>
                <div className="stat-label">Mining Days</div>
              </div>
            </div>
          </div>

          <div className="rank-card glassmorphic">
            <h3>🏆 Your Rank</h3>
            <div className="rank-display">
              <span className="rank-number">#{userStats.rank || 'N/A'}</span>
              <span className="rank-label">Global Ranking</span>
            </div>
          </div>

          <div className="earnings-card glassmorphic">
            <h3>💰 Total Earnings</h3>
            <div className="earnings-value gradient-text">{formatCurrency(totalEarnings)}</div>
          </div>
        </div>
      )}

      {/* Referral View */}
      {view === 'referral' && (
        <div className="view referral-view">
          <h2 className="gradient-text">🤝 Invite Friends</h2>

          <div className="referral-card glassmorphic">
            <div className="referral-code-section">
              <div className="referral-label">Your Referral Code</div>
              <div className="referral-code">{referralCode}</div>
              <button className="copy-btn primary-gradient" onClick={copyReferralLink}>
                <span className="btn-icon">📋</span>
                Copy Link
              </button>
            </div>

            <div className="referral-stats-grid">
              <div className="ref-stat-card glassmorphic">
                <div className="ref-stat-value">{referralStats.total}</div>
                <div className="ref-stat-label">Total Referrals</div>
              </div>
              <div className="ref-stat-card glassmorphic">
                <div className="ref-stat-value">{referralStats.active}</div>
                <div className="ref-stat-label">Active</div>
              </div>
              <div className="ref-stat-card glassmorphic">
                <div className="ref-stat-value">{formatCurrency(referralStats.earned)}</div>
                <div className="ref-stat-label">Earned</div>
              </div>
            </div>
          </div>

          <div className="referral-rewards glassmorphic">
            <h3>🎁 Referral Rewards - NEW SYSTEM!</h3>
            <div className="reward-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#FFD700' }}>💰 Percentage-Based Rewards:</div>
              <div className="reward-text">✅ <strong>You earn:</strong> 10% of ALL your friend's mining rewards forever!</div>
              <div className="reward-text">✅ <strong>Your friend:</strong> Receives 85% (after 5% platform fee)</div>
              <div className="reward-text">✅ <strong>Platform:</strong> 5% fee supports development</div>
            </div>
            <div className="reward-item" style={{ marginTop: '10px', padding: '10px', background: 'rgba(255, 215, 0, 0.1)', borderRadius: '8px' }}>
              <span className="reward-icon">💡</span>
              <span className="reward-text"><strong>Example:</strong> Friend mines 100 TON → You get 10 TON!</span>
            </div>
          </div>
        </div>
      )}

      {/* Achievements View */}
      {view === 'achievements' && (
        <div className="view achievements-view">
          <h2 className="gradient-text">🏆 Achievements</h2>

          {achievements.length === 0 ? (
            <div className="empty-state glassmorphic">
              <div className="empty-icon">🏆</div>
              <p>No achievements yet</p>
              <p className="empty-subtitle">Keep mining to unlock rewards!</p>
            </div>
          ) : (
            <div className="achievements-grid">
              {achievements.map((achievement, i) => (
                <div key={i} className="achievement-card glassmorphic unlocked">
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                    <div className="achievement-date">
                      {new Date(achievement.earned).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Block Found Modal */}
      {showBlockFound && (
        <div className="modal-overlay" onClick={() => setShowBlockFound(null)}>
          <div className="block-found-modal glassmorphic">
            <div className="confetti">🎉</div>
            <h1 className="gradient-text">BLOCK FOUND!</h1>
            <div className="block-details">
              <p>Block #{showBlockFound.blockHeight}</p>
              <h2 className="gradient-text">
                +{formatNumber(showBlockFound.reward)} {showBlockFound.coin}
              </h2>
            </div>
            <button className="continue-btn primary-gradient" onClick={() => setShowBlockFound(null)}>
              Continue Mining
            </button>
          </div>
        </div>
      )}

      {/* Achievement Toast */}
      {newAchievement && (
        <div className="achievement-toast glassmorphic">
          <div className="toast-icon">{newAchievement.icon}</div>
          <div className="toast-text">
            <div className="toast-title">Achievement Unlocked!</div>
            <div className="toast-subtitle">{newAchievement.name}</div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {showNotification && (
        <div className={`notification-toast glassmorphic ${showNotification.type}`}>
          <span className="notif-icon">
            {showNotification.type === 'success' && '✅'}
            {showNotification.type === 'error' && '❌'}
            {showNotification.type === 'info' && 'ℹ️'}
          </span>
          <span className="notif-text">{showNotification.message}</span>
        </div>
      )}
    </div>
  );
}

// React 18 UMD render
const rootEl = document.getElementById('root');
if (ReactDOM.createRoot) {
  ReactDOM.createRoot(rootEl).render(<App />);
} else {
  ReactDOM.render(<App />, rootEl);
}
