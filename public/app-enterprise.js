const { useState, useEffect, useRef } = React;

function App() {
  // Core state
  const [view, setView] = useState('mining'); // mining, referral, nfts, achievements, leaderboard, settings
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');

  // Mining state
  const [selectedPool, setSelectedPool] = useState('minex');
  const [taps, setTaps] = useState(0);
  const [pendingShares, setPendingShares] = useState(0);
  const [rewards, setRewards] = useState({ MineX: 0, tBTC: 0, MRDN: 0 });
  const [nfts, setNfts] = useState([]);

  // TON Connect state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  // Stats state
  const [globalStats, setGlobalStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [recentBlocks, setRecentBlocks] = useState([]);

  // Referral state
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState(null);

  // Achievement state
  const [achievements, setAchievements] = useState([]);
  const [newAchievement, setNewAchievement] = useState(null);

  // Daily reward state
  const [dailyReward, setDailyReward] = useState(null);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState('blocks');

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // AutoTap state
  const [autoTap, setAutoTap] = useState(null);

  // Animation state
  const [blockFoundAnimation, setBlockFoundAnimation] = useState(null);
  const [tapAnimations, setTapAnimations] = useState([]);

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
      loadUserData(user.id);
    }

    // Auto-refresh stats
    const statsInterval = setInterval(() => loadGlobalStats(), 10000);

    return () => {
      clearInterval(statsInterval);
    };
  }, []);

  // Load user data
  const loadUserData = async (uid) => {
    try {
      // Load rewards
      const rewardsRes = await fetch(`/api/claim?userId=${uid}`);
      const rewardsData = await rewardsRes.json();

      if (rewardsData.success) {
        setRewards(rewardsData.rewards || { MineX: 0, tBTC: 0, MRDN: 0 });
        setNfts(rewardsData.nfts || []);
        setWalletConnected(rewardsData.walletConnected);
        setWalletAddress(rewardsData.walletAddress || '');
      }

      // Load user stats
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

  // Load global stats
  const loadGlobalStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();

      if (data.success) {
        setGlobalStats(data.stats);
        setRecentBlocks(data.recentBlocks || []);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  // Handle tap with haptic feedback
  const handleTap = async (e) => {
    if (!userId) return;

    // Haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }

    // Tap animation
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
          // BLOCK FOUND!
          handleBlockFound(data);
        }
      }
    } catch (error) {
      console.error('Mining error:', error);
    }
  };

  // Handle block found
  const handleBlockFound = (data) => {
    // Strong haptic feedback
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }

    // Update rewards
    const pool = pools[selectedPool];
    setRewards(prev => ({
      ...prev,
      [pool.token]: prev[pool.token] + data.finderReward.amount
    }));

    // Show block found animation
    setBlockFoundAnimation(data);
    setTimeout(() => setBlockFoundAnimation(null), 5000);

    // Check for new achievements
    if (data.newAchievements && data.newAchievements.length > 0) {
      setNewAchievement(data.newAchievements[0]);
      setTimeout(() => setNewAchievement(null), 3000);
    }

    // Reload user data
    loadUserData(userId);
    loadGlobalStats();
  };

  // Connect TON wallet
  const connectWallet = async () => {
    try {
      // In production, use real TON Connect
      window.Telegram.WebApp.showAlert('Connect your TON wallet to claim rewards!\n\nTON Connect integration will be available in production.');

      // Simulate connection
      const mockAddress = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
      setWalletConnected(true);
      setWalletAddress(mockAddress);
    } catch (error) {
      console.error('Connect wallet error:', error);
    }
  };

  // Claim rewards
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

  // Claim daily reward
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
          `🎉 Daily Reward Claimed!\n\n` +
          `+${data.reward} MineX\n` +
          `Streak: ${data.streak} days\n` +
          `Multiplier: ${data.multiplier}x`
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

  // Load leaderboard
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
    if (view === 'leaderboard') {
      loadLeaderboard(leaderboardType);
    }
  }, [view, leaderboardType]);

  // Copy referral link
  const copyReferralLink = () => {
    const link = `https://t.me/YourBotName?start=${referralCode}`;
    navigator.clipboard.writeText(link);
    window.Telegram.WebApp.showAlert('Referral link copied!');

    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  // Share referral link
  const shareReferralLink = () => {
    const link = `https://t.me/YourBotName?start=${referralCode}`;
    const text = `Join me on FasTapMining! Mine MineX, tBTC, and MRDN tokens. Use my referral code: ${referralCode}`;

    window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  };

  const currentPool = pools[selectedPool];

  return (
    <div className="App">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <h1>⚡ FasTapMining</h1>
          <div className="header-actions">
            <button
              className="notification-btn"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔 {notifications.filter(n => !n.read).length > 0 &&
                <span className="badge">{notifications.filter(n => !n.read).length}</span>}
            </button>
            <button
              className={`wallet-btn ${walletConnected ? 'connected' : ''}`}
              onClick={connectWallet}
            >
              {walletConnected ? '✅ Wallet' : '🔗 Connect'}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-bar">
        <button
          className={`nav-btn ${view === 'mining' ? 'active' : ''}`}
          onClick={() => setView('mining')}
        >
          ⛏️ Mine
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
          {/* Pool Selector */}
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
              </button>
            ))}
          </div>

          {/* Tap Zone */}
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

            {/* Tap Animations */}
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

          {/* Rewards */}
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

            <button
              className="claim-btn-main"
              onClick={handleClaim}
              disabled={!walletConnected}
            >
              {walletConnected ? 'Claim Rewards' : 'Connect Wallet First'}
            </button>
          </div>

          {/* Global Stats */}
          {globalStats && (
            <div className="global-stats-compact">
              <h3>📊 Global Stats</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-value">{globalStats.totalMiners?.toLocaleString() || 0}</div>
                  <div className="stat-label">Miners</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{globalStats.totalBlocksFound?.toLocaleString() || 0}</div>
                  <div className="stat-label">Blocks</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value">{globalStats.globalHashrate || '0.00'} H/s</div>
                  <div className="stat-label">Hashrate</div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Blocks */}
          {recentBlocks.length > 0 && (
            <div className="recent-blocks-compact">
              <h3>🆕 Recent Blocks</h3>
              {recentBlocks.slice(0, 5).map((block, i) => (
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

      {/* Referral View */}
      {view === 'referral' && (
        <div className="view referral-view">
          <h2>🤝 Invite Friends</h2>

          <div className="referral-card">
            <div className="referral-code-section">
              <div className="referral-label">Your Referral Code</div>
              <div className="referral-code">{referralCode}</div>
              <div className="referral-actions">
                <button className="copy-btn" onClick={copyReferralLink}>
                  📋 Copy Link
                </button>
                <button className="share-btn" onClick={shareReferralLink}>
                  📤 Share
                </button>
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

            <div className="referral-rewards">
              <h3>🎁 Referral Rewards</h3>
              <div className="reward-info">
                <div className="reward-item">
                  <span>You get:</span>
                  <span>100 MineX + 5 tBTC + 500 MRDN</span>
                </div>
                <div className="reward-item">
                  <span>Friend gets:</span>
                  <span>50 MineX + 2 tBTC + 250 MRDN</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NFT Gallery View */}
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
                    <div className={`nft-rarity rarity-${nft.rarity.toLowerCase()}`}>
                      {nft.rarity}
                    </div>
                    <div className="nft-collection">{nft.collection}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Achievements View */}
      {view === 'achievements' && (
        <div className="view achievements-view">
          <h2>🏆 Achievements</h2>

          <div className="achievements-grid">
            {achievements.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏆</div>
                <p>No achievements yet</p>
                <p className="empty-subtitle">Keep mining to unlock achievements!</p>
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

      {/* Leaderboard View */}
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
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👑</div>
                <p>Loading leaderboard...</p>
              </div>
            ) : (
              leaderboard.map((entry, i) => (
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
              ))
            )}
          </div>
        </div>
      )}

      {/* Block Found Animation */}
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

      {/* Achievement Unlocked Animation */}
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
