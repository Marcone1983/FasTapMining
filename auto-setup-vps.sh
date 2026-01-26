#!/bin/bash

# ═══════════════════════════════════════════════════════════
# FASTTAPMINING - AUTO SETUP SCRIPT
# Script 100% automatico per VPS deployment
# ═══════════════════════════════════════════════════════════

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 FASTTAPMINING - AUTO SETUP                            ║"
echo "║  Setup completo VPS + XMRig + Mining Proxy                ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# ═══════════════════════════════════════════════════════════
# 1) RICHIEDI WALLET MONERO (unico input richiesto)
# ═══════════════════════════════════════════════════════════

if [ -z "$1" ]; then
    echo -e "${YELLOW}📋 Hai bisogno del tuo wallet Monero.${NC}"
    echo ""
    echo "Se NON hai un wallet Monero:"
    echo "1. Vai su https://www.getmonero.org/downloads/"
    echo "2. Scarica Monero GUI Wallet"
    echo "3. Crea nuovo wallet e copia l'indirizzo"
    echo ""
    echo "OPPURE usa wallet online:"
    echo "→ https://mymonero.com (instant, no download)"
    echo ""
    read -p "Incolla qui il tuo wallet Monero: " XMR_WALLET

    if [ -z "$XMR_WALLET" ]; then
        echo -e "${RED}❌ Wallet richiesto. Riprova con: ./auto-setup-vps.sh YOUR_WALLET${NC}"
        exit 1
    fi
else
    XMR_WALLET=$1
fi

echo ""
echo -e "${GREEN}✓ Wallet configurato:${NC} ${XMR_WALLET:0:20}...${XMR_WALLET: -10}"
echo ""

# ═══════════════════════════════════════════════════════════
# 2) UPDATE SISTEMA
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[1/6]${NC} Aggiornamento sistema..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq > /dev/null 2>&1
sudo apt-get upgrade -y -qq > /dev/null 2>&1
echo -e "${GREEN}✓ Sistema aggiornato${NC}"

# ═══════════════════════════════════════════════════════════
# 3) INSTALLA DIPENDENZE
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[2/6]${NC} Installazione dipendenze..."
sudo apt-get install -y -qq \
    wget \
    tar \
    git \
    build-essential \
    cmake \
    libuv1-dev \
    libssl-dev \
    libhwloc-dev \
    ca-certificates \
    curl \
    gnupg > /dev/null 2>&1

echo -e "${GREEN}✓ Dipendenze installate${NC}"

# ═══════════════════════════════════════════════════════════
# 4) INSTALLA NODE.JS + PM2
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[3/6]${NC} Installazione Node.js e PM2..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
    sudo apt-get install -y nodejs -qq > /dev/null 2>&1
fi

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2 > /dev/null 2>&1
fi

echo -e "${GREEN}✓ Node.js $(node -v) e PM2 installati${NC}"

# ═══════════════════════════════════════════════════════════
# 5) DOWNLOAD E SETUP XMRIG
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[4/6]${NC} Download e configurazione XMRig..."

cd ~

# Rileva architettura
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    XMRIG_FILE="xmrig-6.21.0-linux-static-x64.tar.gz"
elif [ "$ARCH" = "aarch64" ]; then
    XMRIG_FILE="xmrig-6.21.0-linux-static-arm64.tar.gz"
else
    echo -e "${RED}❌ Architettura non supportata: $ARCH${NC}"
    exit 1
fi

# Download XMRig se non esiste
if [ ! -d "xmrig-6.21.0" ]; then
    echo "   Downloading XMRig..."
    wget -q https://github.com/xmrig/xmrig/releases/download/v6.21.0/$XMRIG_FILE
    tar -xzf $XMRIG_FILE
    rm $XMRIG_FILE
fi

cd xmrig-6.21.0

# Genera configurazione ottimizzata
cat > config.json <<EOF
{
  "autosave": true,
  "cpu": {
    "enabled": true,
    "huge-pages": true,
    "huge-pages-jit": false,
    "hw-aes": null,
    "priority": 5,
    "memory-pool": false,
    "yield": true,
    "max-threads-hint": 100,
    "asm": true
  },
  "opencl": false,
  "cuda": false,
  "donate-level": 1,
  "log-file": null,
  "pools": [
    {
      "algo": null,
      "coin": "monero",
      "url": "gulf.moneroocean.stream:10128",
      "user": "$XMR_WALLET.fasttap-vps",
      "pass": "FasTapMining-VPS",
      "rig-id": "fasttap-vps-1",
      "keepalive": true,
      "enabled": true,
      "tls": false
    }
  ],
  "retries": 5,
  "retry-pause": 5,
  "print-time": 60,
  "health-print-time": 60
}
EOF

# Configura huge pages per performance
echo "   Configurazione huge pages..."
sudo sysctl -w vm.nr_hugepages=128 > /dev/null 2>&1
echo "vm.nr_hugepages=128" | sudo tee -a /etc/sysctl.conf > /dev/null

echo -e "${GREEN}✓ XMRig configurato${NC}"

# ═══════════════════════════════════════════════════════════
# 6) SETUP WEBSOCKET MINING PROXY
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[5/6]${NC} Setup WebSocket Mining Proxy..."

cd ~
mkdir -p mining-proxy
cd mining-proxy

# Installa dipendenza ws
if [ ! -f "package.json" ]; then
    npm init -y > /dev/null 2>&1
    npm install ws > /dev/null 2>&1
fi

# Crea server proxy
cat > server.js <<'PROXYEOF'
const WebSocket = require('ws');
const net = require('net');
const http = require('http');

const PORT = process.env.PORT || 8080;
const poolConnections = new Map();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FasTapMining WebSocket Proxy Server - ONLINE\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId') || 'anonymous';

  console.log(`[${new Date().toISOString()}] Client connected: ${userId}`);

  let poolSocket = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'login') {
        poolSocket = net.createConnection({
          host: 'gulf.moneroocean.stream',
          port: 10128
        });

        poolSocket.on('connect', () => {
          console.log(`[${new Date().toISOString()}] Pool connected for ${userId}`);

          const loginMsg = {
            id: 1,
            jsonrpc: '2.0',
            method: 'login',
            params: {
              login: data.wallet,
              pass: 'x',
              rigid: `client_${userId}`,
              agent: 'FasTapMining-Client/1.0'
            }
          };
          poolSocket.write(JSON.stringify(loginMsg) + '\n');
        });

        poolSocket.on('data', (poolData) => {
          const lines = poolData.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const poolMsg = JSON.parse(line);

              if (poolMsg.result && poolMsg.result.job) {
                ws.send(JSON.stringify({ type: 'job', job: poolMsg.result.job }));
              } else if (poolMsg.method === 'job') {
                ws.send(JSON.stringify({ type: 'job', job: poolMsg.params }));
              } else if (poolMsg.result && poolMsg.result.status === 'OK') {
                ws.send(JSON.stringify({ type: 'share_accepted' }));
                console.log(`[${new Date().toISOString()}] Share accepted for ${userId}`);
              }
            } catch (e) {
              console.error('Parse error:', e.message);
            }
          }
        });

        poolSocket.on('error', (error) => {
          console.error(`[${new Date().toISOString()}] Pool error for ${userId}:`, error.message);
        });

        poolSocket.on('close', () => {
          console.log(`[${new Date().toISOString()}] Pool disconnected for ${userId}`);
          poolConnections.delete(userId);
        });

        poolConnections.set(userId, poolSocket);

      } else if (data.type === 'submit' && poolSocket) {
        const submitMsg = {
          id: Date.now(),
          jsonrpc: '2.0',
          method: 'submit',
          params: {
            id: userId,
            job_id: data.share.job_id,
            nonce: data.share.nonce,
            result: data.share.result
          }
        };
        poolSocket.write(JSON.stringify(submitMsg) + '\n');
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error:`, error.message);
    }
  });

  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] Client disconnected: ${userId}`);
    if (poolSocket) poolSocket.destroy();
    poolConnections.delete(userId);
  });

  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error:`, error.message);
  });
});

server.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`✅ WebSocket Proxy Server ONLINE on port ${PORT}`);
  console.log(`   External URL: ws://YOUR_VPS_IP:${PORT}?userId=USER_ID`);
  console.log('═══════════════════════════════════════════════════════');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});
PROXYEOF

echo -e "${GREEN}✓ Mining Proxy configurato${NC}"

# ═══════════════════════════════════════════════════════════
# 7) AVVIA TUTTO CON PM2
# ═══════════════════════════════════════════════════════════

echo -e "${BLUE}[6/6]${NC} Avvio servizi con PM2..."

# Stop old instances if exist
pm2 delete xmrig-fasttap 2>/dev/null || true
pm2 delete mining-proxy 2>/dev/null || true

# Start XMRig
cd ~/xmrig-6.21.0
pm2 start ./xmrig --name "xmrig-fasttap" -- -c config.json

# Start Mining Proxy
cd ~/mining-proxy
pm2 start server.js --name "mining-proxy"

# Save PM2 config
pm2 save > /dev/null 2>&1

# Setup PM2 startup (auto-restart on reboot)
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME > /dev/null 2>&1

echo -e "${GREEN}✓ Servizi avviati${NC}"

# ═══════════════════════════════════════════════════════════
# 8) OTTIENI IP PUBBLICO
# ═══════════════════════════════════════════════════════════

PUBLIC_IP=$(curl -s ifconfig.me)

# ═══════════════════════════════════════════════════════════
# SETUP COMPLETATO - MOSTRA RIEPILOGO
# ═══════════════════════════════════════════════════════════

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 SETUP COMPLETATO CON SUCCESSO!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}📊 INFORMAZIONI SISTEMA:${NC}"
echo ""
echo "   VPS IP Pubblico:  $PUBLIC_IP"
echo "   Wallet Monero:    ${XMR_WALLET:0:20}...${XMR_WALLET: -10}"
echo ""
echo -e "${YELLOW}🔌 SERVIZI ATTIVI:${NC}"
echo ""
echo "   ✅ XMRig Mining Server"
echo "      Hashrate atteso: 800-2000 H/s"
echo "      Pool: gulf.moneroocean.stream:10128"
echo ""
echo "   ✅ WebSocket Mining Proxy"
echo "      URL: ws://$PUBLIC_IP:8080?userId=USER_ID"
echo "      Porta: 8080"
echo ""
echo -e "${YELLOW}📈 COMANDI UTILI:${NC}"
echo ""
echo "   Verifica mining:"
echo "   → pm2 logs xmrig-fasttap"
echo ""
echo "   Verifica proxy:"
echo "   → pm2 logs mining-proxy"
echo ""
echo "   Status servizi:"
echo "   → pm2 list"
echo ""
echo "   Monitor in tempo reale:"
echo "   → pm2 monit"
echo ""
echo "   Dashboard pool:"
echo "   → https://moneroocean.stream/dashboard?address=$XMR_WALLET"
echo ""
echo -e "${YELLOW}⚙️  CONFIGURAZIONE FRONTEND:${NC}"
echo ""
echo "   Nel tuo file Vercel, aggiungi variabile d'ambiente:"
echo ""
echo "   MINING_PROXY_URL=$PUBLIC_IP:8080"
echo ""
echo "   Oppure modifica app-final.js riga 517:"
echo "   const MINING_PROXY_URL = '$PUBLIC_IP:8080';"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}🚀 IL TUO MINING È ATTIVO!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Attendi 5-10 minuti, poi controlla il dashboard pool."
echo "Dovresti vedere shares accettati e hashrate crescente."
echo ""
echo -e "${BLUE}Per supporto: https://github.com/Marcone1983/FasTapMining${NC}"
echo ""

# ═══════════════════════════════════════════════════════════
# SLEEP 3 SECONDI POI MOSTRA LOGS
# ═══════════════════════════════════════════════════════════

sleep 3
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 XMRIG LOGS (ultimi 20 righe):"
echo "═══════════════════════════════════════════════════════════"
pm2 logs xmrig-fasttap --lines 20 --nostream

echo ""
echo "Premi CTRL+C per uscire dai logs"
echo ""
