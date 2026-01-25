#!/bin/bash

# Script automatico per setup XMRig su Oracle Cloud ARM
# Usage: ./setup-oracle-cloud.sh <VM_NUMBER> <XMR_WALLET>

VM_NUMBER=${1:-1}
XMR_WALLET=${2:-"YOUR_XMR_WALLET_HERE"}

echo "🚀 Setting up XMRig on Oracle Cloud VM #$VM_NUMBER"
echo "================================================"

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "📦 Installing dependencies..."
sudo apt install -y wget tar git build-essential cmake libuv1-dev libssl-dev libhwloc-dev

# Download XMRig
echo "⬇️  Downloading XMRig..."
cd ~
wget https://github.com/xmrig/xmrig/releases/download/v6.21.0/xmrig-6.21.0-linux-static-x64.tar.gz
tar -xzf xmrig-6.21.0-linux-static-x64.tar.gz
cd xmrig-6.21.0

# Create config
echo "⚙️  Creating configuration..."
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
    "asm": true,
    "argon2-impl": null,
    "cn/0": false,
    "cn-lite/0": false
  },
  "opencl": false,
  "cuda": false,
  "donate-level": 1,
  "donate-over-proxy": 1,
  "log-file": null,
  "pools": [
    {
      "algo": null,
      "coin": "monero",
      "url": "gulf.moneroocean.stream:10128",
      "user": "$XMR_WALLET.oracle$VM_NUMBER",
      "pass": "FasTapMining-Oracle-VM$VM_NUMBER",
      "rig-id": "oracle-vm$VM_NUMBER",
      "keepalive": true,
      "enabled": true,
      "tls": false,
      "tls-fingerprint": null,
      "daemon": false,
      "socks5": null,
      "self-select": null,
      "submit-to-origin": false
    }
  ],
  "retries": 5,
  "retry-pause": 5,
  "print-time": 60,
  "health-print-time": 60,
  "dmi": true,
  "syslog": false,
  "tls": {
    "enabled": false,
    "protocols": null,
    "cert": null,
    "cert_key": null,
    "ciphers": null,
    "ciphersuites": null,
    "dhparam": null
  },
  "dns": {
    "ipv6": false,
    "ttl": 30
  },
  "user-agent": null,
  "verbose": 0,
  "watch": true,
  "pause-on-battery": false,
  "pause-on-active": false
}
EOF

# Install PM2
echo "📦 Installing PM2..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# Start XMRig with PM2
echo "▶️  Starting XMRig..."
pm2 start ./xmrig --name "xmrig-oracle-vm$VM_NUMBER" -- -c config.json
pm2 save
pm2 startup

echo ""
echo "✅ Setup completed!"
echo "================================================"
echo "VM Number: $VM_NUMBER"
echo "Wallet: $XMR_WALLET.oracle$VM_NUMBER"
echo ""
echo "📊 Check status:"
echo "   pm2 logs xmrig-oracle-vm$VM_NUMBER"
echo ""
echo "🔍 Monitor hashrate:"
echo "   pm2 monit"
echo ""
echo "Expected hashrate: 1,800-2,200 H/s"
echo "================================================"
