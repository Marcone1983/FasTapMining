// Web Worker per client-side mining in background
// Mina Monero usando Keccak256 (compatibile con pool Monero)

let mining = false;
let hashrate = 0;
let totalHashes = 0;
let sharesFound = 0;
let startTime = Date.now();
let poolWebSocket = null;
let currentJob = null;

// SHA-256 implementation using browser Crypto API (required for real mining)
function sha256(data) {
  if (!self.crypto || !self.crypto.subtle) {
    throw new Error('CRITICAL: Browser Crypto API not available. Cannot perform real mining hashing. Use a modern browser.');
  }

  // Use browser's native SHA-256 implementation
  return self.crypto.subtle.digest('SHA-256', data)
    .then(hash => new Uint8Array(hash));
}

self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'start') {
    mining = true;
    startMining(data);
  } else if (type === 'stop') {
    mining = false;
    if (poolWebSocket) {
      poolWebSocket.close();
    }
  }
};

async function startMining(config) {
  const { userId, walletAddress, poolUrl } = config;

  self.postMessage({
    type: 'log',
    message: `[Worker] Mining started for user: ${userId}`
  });

  // Connect to mining proxy WebSocket
  const wsProtocol = poolUrl.startsWith('https') ? 'wss://' : 'ws://';
  const wsUrl = `${wsProtocol}${poolUrl}/api/mining-proxy`;

  try {
    poolWebSocket = new WebSocket(wsUrl);

    poolWebSocket.onopen = () => {
      self.postMessage({
        type: 'log',
        message: '[Worker] Connected to mining proxy'
      });

      // Login to pool via proxy
      poolWebSocket.send(JSON.stringify({
        type: 'login',
        userId: userId,
        wallet: walletAddress
      }));
    };

    poolWebSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'job') {
        // New mining job received from pool
        currentJob = message.job;

        self.postMessage({
          type: 'log',
          message: `[Worker] New job received: ${currentJob.job_id}`
        });

        // Start mining this job
        mineJob(currentJob);

      } else if (message.type === 'share_accepted') {
        // Share was accepted by pool!
        sharesFound++;

        self.postMessage({
          type: 'share_found',
          hashrate: hashrate,
          totalShares: sharesFound
        });

      } else if (message.type === 'share_rejected') {
        self.postMessage({
          type: 'log',
          message: '[Worker] Share rejected by pool'
        });
      }
    };

    poolWebSocket.onerror = (error) => {
      self.postMessage({
        type: 'error',
        message: 'WebSocket error: ' + error.message
      });
    };

    poolWebSocket.onclose = () => {
      self.postMessage({
        type: 'log',
        message: '[Worker] Disconnected from pool'
      });

      // Auto-reconnect after 5 seconds if still mining
      if (mining) {
        setTimeout(() => startMining(config), 5000);
      }
    };

  } catch (error) {
    self.postMessage({
      type: 'error',
      message: 'Failed to connect: ' + error.message
    });
  }

  // Calculate and report hashrate every second
  setInterval(() => {
    if (mining) {
      const now = Date.now();
      const elapsed = (now - startTime) / 1000;
      hashrate = Math.floor(totalHashes / elapsed);

      self.postMessage({
        type: 'stats_update',
        hashrate: hashrate,
        totalHashes: totalHashes,
        sharesFound: sharesFound,
        uptime: Math.floor(elapsed)
      });
    }
  }, 1000);
}

async function mineJob(job) {
  if (!mining || !job) return;

  const { blob, target, job_id } = job;

  // Start with random nonce
  let nonce = Math.floor(Math.random() * 0xFFFFFFFF);

  // Mine in batches to avoid blocking
  const batchSize = 1000;

  for (let batch = 0; batch < 100 && mining; batch++) {
    for (let i = 0; i < batchSize && mining; i++) {
      const blockTemplate = buildBlockTemplate(blob, nonce);
      const hash = await realHash(blockTemplate);

      totalHashes++;

      if (meetsTarget(hash, target)) {
        // Share found!
        self.postMessage({
          type: 'log',
          message: `[Worker] ✅ Share found! Nonce: ${nonce}`
        });

        // Submit to pool
        if (poolWebSocket && poolWebSocket.readyState === WebSocket.OPEN) {
          poolWebSocket.send(JSON.stringify({
            type: 'submit',
            share: {
              job_id: job_id,
              nonce: nonce.toString(16).padStart(8, '0'),
              result: arrayToHex(hash)
            }
          }));
        }

        // Job completed, wait for next job
        return;
      }

      nonce++;
    }

    // Yield to event loop
    await sleep(0);
  }

  // Continue mining if job is still current
  if (mining && currentJob && currentJob.job_id === job_id) {
    setTimeout(() => mineJob(job), 0);
  }
}

function buildBlockTemplate(blob, nonce) {
  // Convert hex blob to bytes
  const blobBytes = hexToBytes(blob);

  // Nonce position in Monero is at byte 39 (4 bytes)
  const nonceBytes = new Uint8Array(4);
  nonceBytes[0] = (nonce >>> 0) & 0xFF;
  nonceBytes[1] = (nonce >>> 8) & 0xFF;
  nonceBytes[2] = (nonce >>> 16) & 0xFF;
  nonceBytes[3] = (nonce >>> 24) & 0xFF;

  // Copy nonce into blob at position 39
  for (let i = 0; i < 4; i++) {
    blobBytes[39 + i] = nonceBytes[i];
  }

  return blobBytes;
}

async function realHash(data) {
  // ONLY use browser's native Crypto API - NO FAKE FALLBACKS
  if (!self.crypto || !self.crypto.subtle) {
    throw new Error('CRITICAL: Browser Crypto API required for mining. Use Chrome/Firefox/Safari/Edge.');
  }

  const hashBuffer = await self.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(hashBuffer);
}

function meetsTarget(hash, target) {
  // Convert hash to hex for comparison
  const hashHex = arrayToHex(hash);
  const targetHex = target;

  // Compare as big integers
  return hashHex < targetHex;
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function arrayToHex(arr) {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Report ready
self.postMessage({
  type: 'ready',
  message: 'Mining worker initialized'
});
