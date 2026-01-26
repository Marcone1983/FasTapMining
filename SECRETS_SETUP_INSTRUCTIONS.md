# GitHub Secrets Setup Instructions

## ⚠️ SECURITY CRITICAL

**NEVER commit private keys to your repository!**

Your wallet private keys have been saved to:
```
/storage/emulated/0/Download/scrypt-wallets-BACKUP.json
```

## How to Add Secrets to GitHub

### 1. Access Your Repository Settings
1. Go to `https://github.com/YOUR_USERNAME/FasTapMining`
2. Click `Settings` tab
3. Click `Secrets and variables` → `Actions`
4. Click `New repository secret`

### 2. Create These Secrets

Add each secret manually by clicking "New repository secret" for each one:

#### Wallet Private Keys (from your backup file)
- `BELLS_PRIVATE_KEY` - Bellscoin private key
- `LKY_PRIVATE_KEY` - Luckycoin private key
- `PEP_PRIVATE_KEY` - Pepecoin private key
- `JKC_PRIVATE_KEY` - Junkcoin private key
- `DINGO_PRIVATE_KEY` - Dingocoin private key
- `SHIC_PRIVATE_KEY` - Shibacoin private key

**How to get the values:**
1. Open the backup file from Downloads
2. Copy each `privateKey` value
3. Paste into the corresponding GitHub Secret

#### Telegram Bot
- `TOKEN_API_BOT` - Your Telegram Bot token from @BotFather

#### API Keys
- `CHANGENOW_API_KEY` - Get from https://changenow.io
- `TONCENTER_API_KEY` - Get from https://toncenter.com

#### Admin Access
- `ADMIN_KEY` - Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

#### Database
- `DATABASE_URL` - Your production PostgreSQL connection string

### 3. Verify Setup

After adding all secrets, verify they appear in the Secrets list (values will be hidden).

### 4. Delete Backup from Downloads

After you've:
1. ✅ Added all secrets to GitHub
2. ✅ Backed up the file to a secure offline location
3. ✅ Verified secrets are saved

Then delete the file from Downloads for security:
```bash
rm /storage/emulated/0/Download/scrypt-wallets-BACKUP.json
```

## Security Best Practices

✅ Store backup in encrypted offline storage
✅ Use GitHub Secrets for all sensitive data
✅ Never commit .env files with real keys
✅ Rotate keys if compromised

❌ Don't share keys in chat/email
❌ Don't store keys in cloud services
❌ Don't reuse keys across projects
