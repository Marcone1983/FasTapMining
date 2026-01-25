#!/bin/bash

# ULTRA HYBRID MINING SETUP - Automated Installation
# Sets up complete 19,500+ H/s mining infrastructure
# 100% FREE using Oracle Cloud + GCP + AWS + Azure + Client-side

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  🚀 ULTRA HYBRID MINING SETUP                             ║"
echo "║  Target: 19,500+ H/s | Cost: \$0 | Time: 30 minutes        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if XMR wallet provided
if [ -z "$1" ]; then
    echo "❌ Error: XMR wallet address required"
    echo ""
    echo "Usage: $0 <XMR_WALLET_ADDRESS>"
    echo "Example: $0 4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge"
    exit 1
fi

XMR_WALLET=$1

echo "📋 Configuration:"
echo "   XMR Wallet: $XMR_WALLET"
echo ""

# Detect current environment
if [ -f /etc/oracle-cloud ]; then
    ENVIRONMENT="oracle"
elif [ -f /etc/google-cloud ]; then
    ENVIRONMENT="gcp"
elif [ -f /etc/aws ]; then
    ENVIRONMENT="aws"
elif [ -f /etc/azure ]; then
    ENVIRONMENT="azure"
else
    ENVIRONMENT="local"
fi

echo "🖥️  Detected environment: $ENVIRONMENT"
echo ""

# Function to install XMRig
install_xmrig() {
    local VM_NAME=$1
    local HASHRATE_TARGET=$2

    echo "════════════════════════════════════════════════════════"
    echo "Installing XMRig on $VM_NAME (target: $HASHRATE_TARGET H/s)"
    echo "════════════════════════════════════════════════════════"

    # Update system
    echo "📦 Updating system packages..."
    sudo apt update -qq
    sudo apt upgrade -y -qq

    # Install dependencies
    echo "📦 Installing dependencies..."
    sudo apt install -y wget tar git build-essential cmake \
        libuv1-dev libssl-dev libhwloc-dev ca-certificates \
        curl gnupg > /dev/null 2>&1

    # Install Node.js and PM2
    echo "📦 Installing Node.js and PM2..."
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - > /dev/null 2>&1
        sudo apt install -y nodejs > /dev/null 2>&1
    fi

    if ! command -v pm2 &> /dev/null; then
        sudo npm install -g pm2 > /dev/null 2>&1
    fi

    # Download XMRig
    echo "⬇️  Downloading XMRig..."
    cd ~
    if [ ! -d "xmrig-6.21.0" ]; then
        wget -q https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-linux-static-x64.tar.gz
        tar -xzf xmrig-6.21.0-linux-static-x64.tar.gz
        rm xmrig-6.21.0-linux-static-x64.tar.gz
    fi

    cd xmrig-6.21.0

    # Create optimized config
    echo "⚙️  Creating optimized configuration..."
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
      "user": "$XMR_WALLET.$VM_NAME",
      "pass": "FasTapMining-$VM_NAME",
      "rig-id": "$VM_NAME",
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

    # Configure huge pages for better performance
    echo "⚙️  Configuring huge pages..."
    sudo sysctl -w vm.nr_hugepages=128 > /dev/null 2>&1
    echo "vm.nr_hugepages=128" | sudo tee -a /etc/sysctl.conf > /dev/null

    # Start XMRig with PM2
    echo "▶️  Starting XMRig..."
    pm2 delete xmrig-$VM_NAME 2>/dev/null || true
    pm2 start ./xmrig --name "xmrig-$VM_NAME" -- -c config.json
    pm2 save
    pm2 startup > /dev/null 2>&1

    echo "✅ XMRig installed and running!"
    echo ""
}

# Function to install WebSocket proxy server
install_websocket_proxy() {
    echo "════════════════════════════════════════════════════════"
    echo "Installing WebSocket Proxy Server"
    echo "════════════════════════════════════════════════════════"

    cd ~
    mkdir -p mining-proxy
    cd mining-proxy

    # Install ws package
    npm init -y > /dev/null 2>&1
    npm install ws > /dev/null 2>&1

    # Copy proxy server code
    cat > server.js <<'EOF'
const WebSocket = require('ws');
const net = require('net');
const http = require('http');

const PORT = process.env.PORT || 8080;
const poolConnections = new Map();
const activeJobs = new Map();

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('FasTapMining WebSocket Proxy Server\n');
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId') || 'anonymous';

  console.log(`[Proxy] Client connected: ${userId}`);

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
              }
            } catch (e) {}
          }
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
      console.error('[Proxy] Error:', error);
    }
  });

  ws.on('close', () => {
    if (poolSocket) poolSocket.destroy();
    poolConnections.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log(`✅ WebSocket Proxy Server running on port ${PORT}`);
});
EOF

    # Start proxy with PM2
    pm2 delete mining-proxy 2>/dev/null || true
    pm2 start server.js --name "mining-proxy"
    pm2 save

    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me)

    echo "✅ WebSocket Proxy installed!"
    echo "   WebSocket URL: ws://$PUBLIC_IP:8080?userId=USER_ID"
    echo ""
}

# Main installation based on environment
case $ENVIRONMENT in
    oracle)
        echo "🔷 Oracle Cloud detected"
        install_xmrig "oracle1" "2000"
        install_websocket_proxy
        echo ""
        echo "Expected hashrate: 1,800-2,200 H/s"
        ;;
    gcp)
        echo "🔶 Google Cloud detected"
        install_xmrig "gcp1" "1000"
        echo ""
        echo "Expected hashrate: 800-1,200 H/s"
        ;;
    aws)
        echo "🟠 AWS detected"
        install_xmrig "aws1" "500"
        echo ""
        echo "Expected hashrate: 400-600 H/s"
        ;;
    azure)
        echo "🔵 Azure detected"
        install_xmrig "azure1" "500"
        echo ""
        echo "Expected hashrate: 400-600 H/s"
        ;;
    local)
        echo "💻 Local/Termux environment detected"
        install_xmrig "local1" "50"
        echo ""
        echo "Expected hashrate: 10-50 H/s"
        ;;
esac

echo "════════════════════════════════════════════════════════"
echo "🎯 INSTALLATION COMPLETE!"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 Check status:"
echo "   pm2 list"
echo ""
echo "📈 Monitor hashrate:"
echo "   pm2 logs xmrig-*"
echo ""
echo "🔍 View stats:"
echo "   pm2 monit"
echo ""
echo "🌐 Pool dashboard:"
echo "   https://moneroocean.stream/dashboard?address=$XMR_WALLET"
echo ""
echo "════════════════════════════════════════════════════════"
echo "🚀 NEXT STEPS:"
echo "════════════════════════════════════════════════════════"
echo ""
echo "1. Wait 5-10 minutes for shares to be accepted"
echo "2. Check pool dashboard to verify hashrate"
echo "3. Repeat setup on other VMs for maximum hashrate"
echo "4. Deploy frontend to Vercel for client-side mining"
echo ""
echo "Target total: 19,500+ H/s"
echo "Your current VM: $(cat /proc/cpuinfo | grep 'model name' | head -n1 | cut -d':' -f2 | xargs)"
echo ""
echo "✅ Happy mining!"
echo "════════════════════════════════════════════════════════"
