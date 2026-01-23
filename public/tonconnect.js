// TON Connect Integration - Real wallet connection for in-app payments
// No more bot invoices - all payments direct from connected wallet

import { TonConnectUI, THEME } from '@tonconnect/ui';
import { Address, toNano, beginCell } from '@ton/ton';

class TonConnectManager {
  constructor() {
    this.tonConnect = null;
    this.wallet = null;
    this.isConnected = false;
    this.onWalletChange = null;

    this.OWNER_WALLET = 'UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR';
    this.PLATFORM_FEE = 0.05; // 5%
  }

  async init(manifestUrl) {
    try {
      this.tonConnect = new TonConnectUI({
        manifestUrl: manifestUrl || 'https://fastapmining.vercel.app/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-button',
        uiPreferences: {
          theme: THEME.DARK,
          borderRadius: 'm'
        }
      });

      // Listen to wallet connection status
      this.tonConnect.onStatusChange(wallet => {
        this.handleWalletChange(wallet);
      });

      // Restore connection if exists
      const currentWallet = this.tonConnect.wallet;
      if (currentWallet) {
        this.wallet = currentWallet;
        this.isConnected = true;
      }

      console.log('✅ TON Connect initialized');
      return this.tonConnect;
    } catch (error) {
      console.error('❌ TON Connect init error:', error);
      throw error;
    }
  }

  handleWalletChange(wallet) {
    if (wallet) {
      this.wallet = wallet;
      this.isConnected = true;

      const address = wallet.account.address;
      const friendlyAddress = Address.parse(address).toString({
        bounceable: false,
        urlSafe: true
      });

      console.log('✅ Wallet connected:', friendlyAddress);

      if (this.onWalletChange) {
        this.onWalletChange({
          connected: true,
          address: friendlyAddress,
          chain: wallet.account.chain,
          publicKey: wallet.account.publicKey
        });
      }
    } else {
      this.wallet = null;
      this.isConnected = false;

      console.log('❌ Wallet disconnected');

      if (this.onWalletChange) {
        this.onWalletChange({ connected: false });
      }
    }
  }

  async connect() {
    if (this.isConnected) {
      return this.getWalletAddress();
    }

    try {
      await this.tonConnect.openModal();
      // Wait for connection
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000);

        const unsubscribe = this.tonConnect.onStatusChange(wallet => {
          if (wallet) {
            clearTimeout(timeout);
            unsubscribe();
            resolve(this.getWalletAddress());
          }
        });
      });
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.tonConnect.disconnect();
      this.wallet = null;
      this.isConnected = false;
    } catch (error) {
      console.error('Disconnect error:', error);
      throw error;
    }
  }

  getWalletAddress() {
    if (!this.wallet) return null;

    return Address.parse(this.wallet.account.address).toString({
      bounceable: false,
      urlSafe: true
    });
  }

  getWalletInfo() {
    if (!this.wallet) return null;

    return {
      address: this.getWalletAddress(),
      chain: this.wallet.account.chain,
      publicKey: this.wallet.account.publicKey,
      walletStateInit: this.wallet.account.walletStateInit
    };
  }

  /**
   * Pay for lifetime access - 1 TON one-time payment
   */
  async payLifetimeAccess(userId) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const amount = toNano('1'); // 1 TON
      const comment = `FTMACCESS_${userId}`;

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        messages: [
          {
            address: this.OWNER_WALLET,
            amount: amount.toString(),
            payload: beginCell()
              .storeUint(0, 32) // Text comment opcode
              .storeStringTail(comment)
              .endCell()
              .toBoc()
              .toString('base64')
          }
        ]
      };

      const result = await this.tonConnect.sendTransaction(transaction);

      console.log('✅ Lifetime access payment sent:', result);

      return {
        success: true,
        boc: result.boc,
        txHash: this.extractTxHash(result.boc)
      };
    } catch (error) {
      console.error('❌ Payment error:', error);
      throw error;
    }
  }

  /**
   * Buy AutoTap or boost with TON
   */
  async buyItem(itemId, priceInTon, userId) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const amount = toNano(priceInTon.toString());
      const comment = `FTMSHOP_${itemId}_${userId}`;

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: [
          {
            address: this.OWNER_WALLET,
            amount: amount.toString(),
            payload: beginCell()
              .storeUint(0, 32)
              .storeStringTail(comment)
              .endCell()
              .toBoc()
              .toString('base64')
          }
        ]
      };

      const result = await this.tonConnect.sendTransaction(transaction);

      console.log('✅ Item purchase sent:', result);

      return {
        success: true,
        boc: result.boc,
        txHash: this.extractTxHash(result.boc)
      };
    } catch (error) {
      console.error('❌ Purchase error:', error);
      throw error;
    }
  }

  /**
   * Claim mining rewards - send tokens to connected wallet
   */
  async claimRewards(rewards, userId) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    const walletAddress = this.getWalletAddress();

    try {
      // Call backend to process claim and send tokens
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          walletAddress: walletAddress,
          rewards: rewards
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Claim failed');
      }

      console.log('✅ Rewards claimed:', data);

      return {
        success: true,
        transactions: data.transactions,
        royalties: data.royaltyTransactions,
        message: data.message
      };
    } catch (error) {
      console.error('❌ Claim error:', error);
      throw error;
    }
  }

  /**
   * Send multi-token transaction (MineX, tBTC, MRDN)
   */
  async sendMultiTokenTransaction(transactions) {
    if (!this.isConnected) {
      throw new Error('Wallet not connected');
    }

    try {
      const messages = transactions.map(tx => {
        // For jettons, we need to send to jetton wallet with transfer message
        // This is simplified - in production, query actual jetton wallet addresses
        return {
          address: tx.jettonMaster || this.OWNER_WALLET,
          amount: toNano('0.05').toString(), // Gas fee for jetton transfer
          payload: this.buildJettonTransferPayload(
            tx.recipientAddress,
            tx.amount,
            tx.comment || ''
          )
        };
      });

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 600,
        messages: messages
      };

      const result = await this.tonConnect.sendTransaction(transaction);

      console.log('✅ Multi-token transaction sent:', result);

      return {
        success: true,
        boc: result.boc,
        txHash: this.extractTxHash(result.boc)
      };
    } catch (error) {
      console.error('❌ Multi-token transaction error:', error);
      throw error;
    }
  }

  /**
   * Build jetton transfer payload
   */
  buildJettonTransferPayload(toAddress, amount, comment) {
    const payload = beginCell()
      .storeUint(0xf8a7ea5, 32) // Jetton transfer op
      .storeUint(0, 64) // Query ID
      .storeCoins(amount) // Amount
      .storeAddress(Address.parse(toAddress)) // Destination
      .storeAddress(Address.parse(toAddress)) // Response destination
      .storeBit(0) // No custom payload
      .storeCoins(0) // Forward amount
      .storeBit(0); // No forward payload

    if (comment) {
      payload.storeBit(1); // Has comment
      payload.storeRef(
        beginCell()
          .storeUint(0, 32)
          .storeStringTail(comment)
          .endCell()
      );
    }

    return payload.endCell().toBoc().toString('base64');
  }

  /**
   * Extract transaction hash from BOC
   */
  extractTxHash(boc) {
    try {
      // In production, parse BOC properly
      // For now, return placeholder that backend will verify
      return Buffer.from(boc, 'base64').toString('hex').slice(0, 64);
    } catch (error) {
      console.error('Extract hash error:', error);
      return null;
    }
  }

  /**
   * Get wallet balance
   */
  async getBalance() {
    if (!this.isConnected) return null;

    try {
      const address = this.getWalletAddress();

      // Call TON API to get balance
      const response = await fetch(
        `https://toncenter.com/api/v2/getAddressBalance?address=${address}`,
        {
          headers: {
            'X-API-Key': process.env.TONCENTER_API_KEY || ''
          }
        }
      );

      const data = await response.json();

      if (data.ok) {
        const balance = parseInt(data.result) / 1e9; // Convert from nanoTON
        return balance;
      }

      return null;
    } catch (error) {
      console.error('Get balance error:', error);
      return null;
    }
  }

  /**
   * Verify transaction on blockchain
   */
  async verifyTransaction(txHash, expectedAmount, expectedComment) {
    try {
      // Query TON blockchain for transaction
      const response = await fetch(
        `https://toncenter.com/api/v2/getTransactions?address=${this.OWNER_WALLET}&limit=100`,
        {
          headers: {
            'X-API-Key': process.env.TONCENTER_API_KEY || ''
          }
        }
      );

      const data = await response.json();

      if (!data.ok) {
        throw new Error('Failed to fetch transactions');
      }

      // Find matching transaction
      const tx = data.result.find(t => {
        const inMsg = t.in_msg;
        if (!inMsg) return false;

        const amount = parseInt(inMsg.value) / 1e9;
        const message = inMsg.message || '';

        return (
          amount >= expectedAmount &&
          message.includes(expectedComment)
        );
      });

      if (tx) {
        return {
          verified: true,
          transaction: tx,
          amount: parseInt(tx.in_msg.value) / 1e9,
          timestamp: tx.utime
        };
      }

      return { verified: false };
    } catch (error) {
      console.error('Verify transaction error:', error);
      return { verified: false, error: error.message };
    }
  }

  /**
   * Subscribe to transaction events
   */
  onTransaction(callback) {
    // In production, use WebSocket to TON API
    // For now, poll for new transactions
    const pollInterval = setInterval(async () => {
      if (!this.isConnected) {
        clearInterval(pollInterval);
        return;
      }

      try {
        const response = await fetch(
          `https://toncenter.com/api/v2/getTransactions?address=${this.getWalletAddress()}&limit=10`,
          {
            headers: {
              'X-API-Key': process.env.TONCENTER_API_KEY || ''
            }
          }
        );

        const data = await response.json();

        if (data.ok && data.result.length > 0) {
          const latestTx = data.result[0];
          callback(latestTx);
        }
      } catch (error) {
        console.error('Transaction polling error:', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }
}

// Singleton instance
const tonConnectManager = new TonConnectManager();

export default tonConnectManager;
export { TonConnectManager };
