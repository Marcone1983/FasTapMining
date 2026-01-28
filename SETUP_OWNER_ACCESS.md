# 🔐 SETUP OWNER ACCESS - Telegram ID Configuration

**IMPORTANTE:** Il tuo Telegram ID **856208904** deve essere configurato come variabile d'ambiente su Vercel per il riconoscimento automatico come owner.

---

## ⚡ METODO RAPIDO (Vercel Dashboard)

### 1. Vai su Vercel Dashboard
https://vercel.com/dashboard

### 2. Seleziona il progetto FasTapMining
Click sul progetto nella lista

### 3. Vai in Settings
- Click su **Settings** (tab in alto)
- Nel menu laterale, click su **Environment Variables**

### 4. Aggiungi la variabile
- **Name:** `OWNER_TELEGRAM_IDS`
- **Value:** `856208904`
- **Environment:** Seleziona **Production**, **Preview**, **Development** (tutti e 3)
- Click su **Save**

### 5. Redeploy
- Torna alla tab **Deployments**
- Click sui 3 puntini dell'ultimo deployment
- Click su **Redeploy**
- Aspetta 1-2 minuti

---

## ✅ VERIFICA CHE FUNZIONI

Dopo il redeploy:

1. Vai su: https://fas-tap-mining.vercel.app
2. **Hard refresh:** Ctrl+Shift+R (Cmd+Shift+R su Mac)
3. Connetti il tuo wallet TON
4. Dovresti vedere subito: **"👑 Owner Access Activated - Mine FREE Forever!"**
5. Nessun paywall, mining sbloccato istantaneamente!

---

## 🔍 DEBUG (se non funziona)

### Controlla i logs Vercel:

1. Vercel Dashboard → **Functions** tab
2. Click su un function log recente
3. Cerca nel log:

```
🔍 OWNER CHECK DEBUG:
  User ID: 856208904
  Match: true ← DEVE ESSERE TRUE!
```

Se vedi `Match: false`, la variabile d'ambiente non è stata configurata correttamente.

---

## 📝 NOTE DI SICUREZZA

**Perché non è hardcoded nel codice?**
- Il codice è pubblico su GitHub
- Chiunque potrebbe vedere l'ID e usarlo
- Le variabili d'ambiente su Vercel sono **private**
- Solo chi ha accesso al dashboard Vercel può vederle

**Il Telegram ID è un secret?**
- No, è informazione pubblica (chiunque può vedere il tuo ID se ti manda un messaggio)
- Ma è buona pratica non pubblicarlo nel codice sorgente
- Previene tentativi di accesso non autorizzato

---

## 🚀 ALTERNATIVA: Vercel CLI

Se preferisci usare il terminale:

```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Link al progetto
vercel link

# Aggiungi variabile d'ambiente
vercel env add OWNER_TELEGRAM_IDS production
# Quando chiede il valore, inserisci: 856208904

# Redeploy
vercel --prod
```

---

## 💡 SUPPORTO MULTIPLI OWNER

Se vuoi aggiungere altri owner in futuro:

```
OWNER_TELEGRAM_IDS=856208904,123456789,987654321
```

Separa gli ID con virgole (no spazi).

---

**Una volta configurato, il riconoscimento owner sarà ISTANTANEO e AUTOMATICO! 👑**
