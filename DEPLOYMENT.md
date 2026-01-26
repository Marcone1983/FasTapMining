# 🚀 DEPLOYMENT FASTTAPMINING

**Sistema Tap-to-Earn su TON Blockchain**

---

## 🎯 COSA SERVE (TUTTO GRATIS):

1. **Account GitHub** (per codice)
2. **Account Vercel** (per hosting GRATIS)
3. **Database PostgreSQL** (Vercel Postgres o Supabase GRATIS)
4. **Bot Telegram** (creato con @BotFather)
5. **TON Connect** (già integrato nel codice)

**COSTO TOTALE: €0** ✅

---

## STEP 1: CREA BOT TELEGRAM (2 minuti)

### 1. Apri Telegram e cerca: **@BotFather**

### 2. Invia comando:
```
/newbot
```

### 3. Scegli nome del bot:
```
FasTapMining Bot
```

### 4. Scegli username (deve finire con "bot"):
```
fasttapmining_bot
```

### 5. **COPIA IL TOKEN** che ti dà BotFather

Esempio:
```
6891234567:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
```

**SALVALO!** Ne avrai bisogno dopo.

```
Il mio bot token: ___________________
```

### 6. Configura bot per Mini App:

Invia a @BotFather:
```
/setmenubutton
```

Scegli il tuo bot, poi invia:
```
{
  "text": "🎮 Play & Earn",
  "web_app": {
    "url": "https://TUO-APP.vercel.app"
  }
}
```

(Cambierai l'URL dopo aver deployato su Vercel)

---

## STEP 2: CREA DATABASE POSTGRESQL (5 minuti)

### Opzione A: Vercel Postgres (RACCOMANDATO)

1. Vai su: **https://vercel.com**
2. Login con GitHub
3. Click **"Storage"** → **"Create Database"**
4. Scegli **"Postgres"**
5. Nome: **fasttapmining-db**
6. Region: **Washington, D.C. (iad1)**
7. Click **"Create"**

### Opzione B: Supabase (Alternativa)

1. Vai su: **https://supabase.com**
2. Login con GitHub
3. Click **"New project"**
4. Nome: **fasttapmining**
5. Database Password: **scegli password forte**
6. Region: **North Europe (Frankfurt)**
7. Click **"Create project"**

---

## STEP 3: SETUP DATABASE SCHEMA (3 minuti)

### Se usi Vercel Postgres:

1. Nella dashboard Vercel, vai su Storage → fasttapmining-db
2. Click **"Query"** tab
3. Copia TUTTO il contenuto di `database/schema.sql` e incollalo
4. Click **"Run Query"**

### Se usi Supabase:

1. Dashboard Supabase → SQL Editor
2. Click **"New query"**
3. Copia TUTTO il contenuto di `database/schema.sql` e incollalo
4. Click **"Run"**

✅ Database pronto!

---

## STEP 4: DEPLOY SU VERCEL (5 minuti)

### 1. Vai su: **https://vercel.com**

### 2. Click **"Add New Project"**

### 3. Import dal tuo GitHub repository:
```
https://github.com/TUO-USERNAME/FasTapMining
```

### 4. Configura Environment Variables:

Click **"Environment Variables"** e aggiungi:

```
TOKEN_API_BOT=il_tuo_bot_token_qui
```

**Se usi Vercel Postgres:**
- Vercel collega automaticamente il database (niente da fare)

**Se usi Supabase:**
Aggiungi anche:
```
DATABASE_URL=postgresql://postgres:TUA_PASSWORD@db.xxx.supabase.co:5432/postgres
```

(Prendi l'URL da Supabase → Settings → Database → Connection string)

### 5. Click **"Deploy"**

Aspetta 2-3 minuti...

✅ Quando vedi "Congratulations!", il sito è online!

### 6. **COPIA L'URL DEL DEPLOY**

Esempio:
```
https://fast-tap-mining-abc123.vercel.app
```

---

## STEP 5: CONFIGURA BOT TELEGRAM (2 minuti)

### 1. Torna su Telegram → @BotFather

### 2. Invia:
```
/setmenubutton
```

### 3. Scegli il tuo bot

### 4. Invia questo JSON (SOSTITUISCI L'URL!):
```json
{
  "text": "🎮 Play & Earn",
  "web_app": {
    "url": "https://IL-TUO-URL.vercel.app"
  }
}
```

### 5. Configura descrizione:
```
/setdescription
```

Poi invia:
```
⛏️ Tap to mine MineX, tBTC & MRDN tokens on TON!

🎯 Find blocks and earn 70% finder reward
💰 30% pool reward shared with all miners
🎨 Win rare NFTs from Meridian pool

Start tapping now!
```

### 6. Configura about:
```
/setabouttext
```

Poi invia:
```
Real mining pool on TON Blockchain. Tap to generate shares and find blocks!
```

---

## STEP 6: TESTA IL BOT (1 minuto)

### 1. Apri il tuo bot su Telegram

### 2. Click sul menu button "🎮 Play & Earn"

### 3. Dovresti vedere l'app aprirsi!

### 4. Prova a tappare e guarda i numeri salire

---

## ✅ HAI FINITO!

Il tuo sistema di mining è **LIVE e FUNZIONANTE!**

---

## 📊 COME FUNZIONA:

```
USER TAPPA
    ↓
Genera Hash SHA-256
    ↓
Se hash < difficulty → BLOCCO TROVATO! 🎉
    ↓
Ricompense:
├─ 70% → Chi ha trovato il blocco
└─ 30% → Diviso tra TUTTI per shares contribuite

3 POOL disponibili:
├─ MineX (40% weight, 100 MineX reward)
├─ TonBitcoin (30% weight, 50 tBTC reward)
└─ Meridian (30% weight, 1000 MRDN + NFT drop)
```

---

## 💰 CLAIM REWARDS:

1. Connetti TON wallet (click "Connect Wallet")
2. Usa **Tonkeeper** o **TON Space** (Telegram Wallet)
3. Quando hai almeno $1 di valore, click "Claim Rewards"
4. Conferma transazione sul wallet
5. Tokens arrivano nel tuo wallet TON!

---

## 🔧 COMANDI UTILI:

### Vedere logs del deployment:
```
https://vercel.com/TUO-USERNAME/fast-tap-mining/deployments
```

### Vedere analytics:
```
https://vercel.com/TUO-USERNAME/fast-tap-mining/analytics
```

### Vedere database:
```
Vercel: Storage → fasttapmining-db → Data
Supabase: Table Editor
```

---

## 📈 SCALARE IL PROGETTO:

### 1. **Invita utenti:**
   - Condividi link del bot
   - Sistema referral integrato (rewards per referral)

### 2. **Monitoring:**
   - Vercel analytics (incluso gratis)
   - Database query logs

### 3. **Upgrade (se necessario):**
   - Vercel: Passa a Pro ($20/mese) solo se superi 100GB bandwidth
   - Database: Supabase Pro ($25/mese) solo se superi 500MB database

**Per 1000-10000 utenti: TUTTO GRATIS!** ✅

---

## 🆘 TROUBLESHOOTING:

### Bot non risponde:
- Verifica TOKEN_API_BOT su Vercel → Settings → Environment Variables
- Redeploy dopo aver cambiato variabili

### Database error:
- Verifica che schema.sql sia stato eseguito
- Check connection string se usi Supabase

### Frontend non carica:
- Check deployment logs su Vercel
- Verifica che build sia succeeded (verde)

### TON Connect non funziona:
- Verifica che `public/tonconnect-manifest.json` abbia URL corretto
- Deve essere:
  ```json
  {
    "url": "https://IL-TUO-URL.vercel.app",
    "name": "FasTapMining",
    ...
  }
  ```

---

## 📚 DOCS:

- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **TON Connect:** https://docs.ton.org/develop/dapps/ton-connect
- **Telegram Mini Apps:** https://core.telegram.org/bots/webapps

---

## 🎉 CONGRATULAZIONI!

Hai deployato un sistema di **tap-to-earn completo** su TON Blockchain!

**COSTO: €0**
**TEMPO: 20 minuti**
**SCALABILE: fino a 100k utenti GRATIS**

🚀 **Happy mining!**
