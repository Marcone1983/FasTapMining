# 🔒 Deploy Environment Variables SECURELY

## ✅ METODO SICURO - Via Vercel CLI

```bash
# 1. Installa Vercel CLI (se non hai)
npm install -g vercel

# 2. Login
vercel login

# 3. Link progetto
vercel link

# 4. Le variabili nel .env vengono lette automaticamente da Vercel!
# Basta fare deploy:
vercel --prod

# Vercel legge automaticamente .env e le usa per il deployment
```

## ⚠️ IMPORTANTE

Il file `.env` contiene secrets (password, API keys).
**NON condividere MAI** questo file.
Vercel CLI lo usa localmente senza esporlo.

## 🧪 Test dopo deploy

```bash
# Aspetta 1-2 minuti che finisca il deploy, poi:
curl https://fas-tap-mining.vercel.app/api/health

# Se risponde "healthy" → Everything OK!
# Se errore → Check Vercel logs
```

## 🔄 Restart Bot

```bash
pm2 restart fastap-bot
```

## ✅ Test Tap

1. Apri bot Telegram
2. /start → Start Mining
3. Fai 10 tap
4. Stats devono aggiornarsi!
