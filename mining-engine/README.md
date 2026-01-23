# FasTapMining - Real Mining Engine

## 🔥 SISTEMA DI MINING REALE

Questo sistema converte i tap degli utenti in hashrate reale per minare Monero (XMR), che viene poi convertito automaticamente in MineX, tBTC e MRDN tramite DEX su TON.

## 📋 Come Funziona

1. **User Taps** → Gli utenti tappano nell'app
2. **Hashrate Aggregation** → I tap vengono convertiti in hashpower (1000 taps = 1 H/s)
3. **Real Mining** → Il backend mina XMR reale su pool Monero
4. **Automatic Conversion** → XMR viene convertito in TON → MineX/tBTC/MRDN
5. **Reward Distribution** → Token distribuiti proporzionalmente ai tap

## ⚙️ Setup

### 1. Wallet Monero

Crea un wallet Monero per ricevere le mining rewards:

```bash
# Download Monero CLI
wget https://downloads.getmonero.org/cli/monero-linux-x64-v0.18.3.1.tar.bz2
tar -xjf monero-linux-x64-v0.18.3.1.tar.bz2

# Create wallet
./monero-wallet-cli --generate-new-wallet mining-wallet
```

Copia l'indirizzo del wallet in `.env`:
```
XMR_WALLET=your_monero_address_here
```

### 2. ChangeNOW API Key

Registrati su [ChangeNOW](https://changenow.io/api/docs) per ottenere API key per conversioni crypto:

```
CHANGENOW_API_KEY=your_api_key_here
```

### 3. TON Wallet

Configura il wallet TON che riceverà i token convertiti:

```
TON_WALLET=your_ton_wallet_address
```

## 🎯 Mining Pool Configuration

Pool Monero utilizzato:
- **Host**: `gulf.moneroocean.stream`
- **Port**: `10128`
- **Protocol**: Stratum
- **Algorithm**: RandomX (CPU-optimized)

### Perché Monero?

1. **CPU-mineable** - Nessun bisogno di GPU costose
2. **Profitable** - Buon ROI anche con CPU
3. **Easy conversion** - Facilmente convertibile in altre crypto
4. **Stable network** - Pool affidabili e reward stabili

## 💰 Token Conversion Flow

```
User Taps
   ↓
XMR Mining (Monero Pool)
   ↓
XMR → TON (ChangeNOW)
   ↓
TON → 40% MineX (DeDust DEX)
     30% tBTC  (DeDust DEX)
     30% MRDN  (DeDust DEX)
   ↓
Distribution to Users (proportional to taps)
```

## 📊 Reward Calculation

**Formula:**
```javascript
userReward = (userTaps / totalTaps) * minedAmount
```

**Example:**
- Total taps: 100,000
- Your taps: 1,000 (1%)
- XMR mined: 0.001 XMR
- Your share: 0.00001 XMR
- Converted to:
  - MineX: ~400 tokens
  - tBTC: ~0.002 tokens
  - MRDN: ~50 tokens

## 🚀 Start Mining

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Add your wallet addresses and API keys

# Start the mining engine
npm run start-mining
```

The mining engine will:
1. Connect to Monero pool
2. Aggregate user taps into hashrate
3. Submit valid shares to pool
4. Convert XMR to tokens automatically
5. Distribute rewards to users

## 📈 Monitoring

Check mining stats:
```bash
curl http://localhost:3000/api/stats | jq .realMining
```

Output:
```json
{
  "hashrate": "45.23 H/s",
  "minedXMR": "0.000123 XMR",
  "activeMiners": 1523,
  "totalTaps": 45234
}
```

## ⚠️ Requirements

- **Node.js** 18+ with worker threads support
- **Stable internet** for pool connection
- **Monero wallet** for receiving rewards
- **ChangeNOW API key** for conversions
- **TON wallet** for final token distribution

## 🔧 Advanced Configuration

### Custom Mining Pool

Edit `real-mining.js` to use different pool:

```javascript
const MINING_POOLS = {
  monero: {
    host: 'your.pool.com',
    port: 3333,
    wallet: process.env.XMR_WALLET,
    password: 'x'
  }
};
```

### Adjust Conversion Ratios

Change token distribution percentages:

```javascript
const tokens = {
  MineX: await this.swapOnDEX('TON', 'MineX', tonAmount * 0.4), // 40%
  tBTC: await this.swapOnDEX('TON', 'tBTC', tonAmount * 0.3),   // 30%
  MRDN: await this.swapOnDEX('TON', 'MRDN', tonAmount * 0.3)    // 30%
};
```

## 📚 Resources

- [Monero Mining Guide](https://www.getmonero.org/get-started/mining/)
- [MoneroOcean Pool](https://moneroocean.stream/)
- [ChangeNOW API](https://changenow.io/api/docs)
- [DeDust DEX](https://dedust.io/)
- [TON Documentation](https://docs.ton.org/)

## 🆘 Support

Mining issues? Check:
1. Pool connection: `telnet gulf.moneroocean.stream 10128`
2. Wallet address validity
3. API key permissions
4. Network firewall rules

## ⚖️ Legal & Compliance

- Mining rewards are subject to local tax laws
- Users must comply with crypto regulations in their jurisdiction
- This is real cryptocurrency mining with actual financial value
- No guarantees on profitability or returns
