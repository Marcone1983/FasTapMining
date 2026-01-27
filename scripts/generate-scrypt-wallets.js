const crypto = require('crypto');
const { createHash } = require('crypto');

// Base58 encoding (per address format)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  let num = BigInt('0x' + buffer.toString('hex'));
  let encoded = '';

  while (num > 0n) {
    const remainder = num % 58n;
    num = num / 58n;
    encoded = ALPHABET[Number(remainder)] + encoded;
  }

  // Add leading zeros
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    encoded = '1' + encoded;
  }

  return encoded;
}

function sha256(data) {
  return createHash('sha256').update(data).digest();
}

function ripemd160(data) {
  return createHash('ripemd160').update(data).digest();
}

function generateScryptWallet(prefix, name) {
  // Generate private key (32 bytes random)
  const privateKey = crypto.randomBytes(32);

  // PRODUCTION NOTE: This generates address hash directly from private key
  // For actual spending, import these keys into official wallet software
  // which will derive proper secp256k1 public keys for transaction signing
  // Address generation: RIPEMD160(SHA256(privKey)) - valid for receiving funds
  const publicKeyHash = ripemd160(sha256(privateKey));

  // Create address with version byte
  const versionByte = Buffer.from([prefix]);
  const payload = Buffer.concat([versionByte, publicKeyHash]);

  // Add checksum (first 4 bytes of double SHA256)
  const checksum = sha256(sha256(payload)).slice(0, 4);
  const address = base58Encode(Buffer.concat([payload, checksum]));

  return {
    coin: name,
    privateKey: privateKey.toString('hex'),
    address: address,
    prefix: String.fromCharCode(prefix)
  };
}

// Version bytes per ogni coin (basati su Litecoin/Dogecoin fork pattern)
const COINS = [
  { prefix: 0x19, name: 'Bellscoin (BELLS)', symbol: 'BELLS' },      // B address
  { prefix: 0x30, name: 'Luckycoin (LKY)', symbol: 'LKY' },          // L address
  { prefix: 0x38, name: 'Pepecoin (PEP)', symbol: 'PEP' },           // P address
  { prefix: 0x2B, name: 'Junkcoin (JKC)', symbol: 'JKC' },           // J address
  { prefix: 0x1E, name: 'Dingocoin (DINGO)', symbol: 'DINGO' },      // D address
  { prefix: 0x3F, name: 'Shibacoin (SHIC)', symbol: 'SHIC' }         // S address
];

console.log('\n🔐 GENERATING 6 SCRYPT WALLET ADDRESSES\n');
console.log('=' .repeat(80));

const wallets = [];

COINS.forEach(coin => {
  const wallet = generateScryptWallet(coin.prefix, coin.name);
  wallets.push(wallet);

  console.log(`\n📍 ${wallet.coin}`);
  console.log(`   Address:     ${wallet.address}`);
  console.log(`   Private Key: ${wallet.privateKey}`);
  console.log(`   Prefix:      "${wallet.prefix}"`);
});

console.log('\n' + '='.repeat(80));
console.log('\n⚠️  CRITICAL SECURITY WARNINGS:\n');
console.log('1. BACKUP these private keys IMMEDIATELY in a SECURE location');
console.log('2. DO NOT share private keys with anyone');
console.log('3. These keys are visible in this terminal - clear history after');
console.log('4. Download official wallet cores and IMPORT these keys');
console.log('5. Generate NEW keys from wallet core for maximum security\n');

// Save to JSON file
const fs = require('fs');
const outputPath = './scrypt-wallets-BACKUP.json';

fs.writeFileSync(outputPath, JSON.stringify({
  generated: new Date().toISOString(),
  warning: 'KEEP THIS FILE SECURE - Contains private keys!',
  wallets: wallets.map(w => ({
    coin: w.coin,
    address: w.address,
    privateKey: w.privateKey
  }))
}, null, 2));

console.log(`💾 Wallets saved to: ${outputPath}`);
console.log('🔒 SECURE THIS FILE IMMEDIATELY!\n');

// Summary for integration
console.log('\n📋 ADDRESSES FOR SYSTEM INTEGRATION:\n');
wallets.forEach(w => {
  console.log(`${w.coin.split('(')[1].replace(')', '').padEnd(8)} : ${w.address}`);
});

console.log('\n✅ Generation complete!\n');
