// WebSocket proxy per client-side mining
// Permette ai Web Workers di connettersi alle pool Monero via browser

const net = require('net');

// Pool connections cache
const poolConnections = new Map(); // userId → TCP socket to pool

// Active jobs cache
const activeJobs = new Map(); // userId → current job

module.exports = (req, res) => {
  // Check if WebSocket upgrade
  if (!req.headers.upgrade || req.headers.upgrade.toLowerCase() !== 'websocket') {
    return res.status(400).json({
      error: 'WebSocket upgrade required',
      message: 'This endpoint only accepts WebSocket connections'
    });
  }

  // Vercel doesn't support WebSocket natively in serverless
  // We need to use a different approach or dedicated WebSocket server

  // For Vercel deployment, return instructions
  return res.status(200).json({
    info: 'Client-side mining proxy',
    message: 'For production, deploy this endpoint to a dedicated WebSocket server',
    alternative: 'Use HTTP polling or Server-Sent Events (SSE) for Vercel',
    recommendation: 'Deploy WebSocket server to Oracle Cloud Free Tier VM alongside XMRig'
  });
};

// Function to handle WebSocket connection (for dedicated server)
function handleWebSocketConnection(ws, userId) {
  let poolSocket = null;

  console.log(`[Proxy] New client connection: ${userId}`);

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'login') {
        // Connect to Monero pool
        poolSocket = net.createConnection({
          host: 'gulf.moneroocean.stream',
          port: 10128
        });

        poolSocket.on('connect', () => {
          console.log(`[Proxy] Connected to pool for user ${userId}`);

          // Send login to pool
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
          // Parse pool responses (can be multiple JSON objects)
          const lines = poolData.toString().split('\n').filter(Boolean);

          for (const line of lines) {
            try {
              const poolMsg = JSON.parse(line);

              // Login response
              if (poolMsg.id === 1 && poolMsg.result) {
                ws.send(JSON.stringify({
                  type: 'logged_in',
                  message: 'Successfully logged into pool'
                }));

                // Check if job included in login response
                if (poolMsg.result.job) {
                  const job = poolMsg.result.job;
                  activeJobs.set(userId, job);

                  ws.send(JSON.stringify({
                    type: 'job',
                    job: job
                  }));
                }
              }

              // New job notification
              if (poolMsg.method === 'job') {
                const job = poolMsg.params;
                activeJobs.set(userId, job);

                ws.send(JSON.stringify({
                  type: 'job',
                  job: job
                }));
              }

              // Share result
              if (poolMsg.id > 1) {
                if (poolMsg.result && poolMsg.result.status === 'OK') {
                  ws.send(JSON.stringify({
                    type: 'share_accepted',
                    message: 'Share accepted by pool'
                  }));
                } else if (poolMsg.error) {
                  ws.send(JSON.stringify({
                    type: 'share_rejected',
                    message: poolMsg.error.message || 'Share rejected'
                  }));
                }
              }

            } catch (parseError) {
              console.error('[Proxy] Failed to parse pool message:', parseError);
            }
          }
        });

        poolSocket.on('error', (error) => {
          console.error(`[Proxy] Pool connection error for ${userId}:`, error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Pool connection error: ' + error.message
          }));
        });

        poolSocket.on('close', () => {
          console.log(`[Proxy] Pool connection closed for ${userId}`);
          poolConnections.delete(userId);
        });

        poolConnections.set(userId, poolSocket);

      } else if (data.type === 'submit') {
        // Submit share to pool
        if (poolSocket && !poolSocket.destroyed) {
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

          console.log(`[Proxy] Share submitted for user ${userId}`);
        } else {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Not connected to pool'
          }));
        }
      }

    } catch (error) {
      console.error('[Proxy] Message handling error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message: ' + error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log(`[Proxy] Client disconnected: ${userId}`);

    // Close pool connection
    if (poolSocket && !poolSocket.destroyed) {
      poolSocket.destroy();
    }

    poolConnections.delete(userId);
    activeJobs.delete(userId);
  });

  ws.on('error', (error) => {
    console.error(`[Proxy] WebSocket error for ${userId}:`, error);
  });
}

// Export handler for dedicated WebSocket server
module.exports.handleWebSocketConnection = handleWebSocketConnection;

// Standalone WebSocket server (run on Oracle Cloud VM)
if (require.main === module) {
  const WebSocket = require('ws');
  const http = require('http');

  const PORT = process.env.PORT || 8080;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('FasTapMining WebSocket Proxy Server\n');
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    // Extract userId from query string or headers
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId') || 'anonymous';

    handleWebSocketConnection(ws, userId);
  });

  server.listen(PORT, () => {
    console.log(`✅ WebSocket Proxy Server running on port ${PORT}`);
    console.log(`   ws://localhost:${PORT}?userId=YOUR_USER_ID`);
  });
}
