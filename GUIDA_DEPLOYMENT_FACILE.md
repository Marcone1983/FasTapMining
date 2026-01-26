# 🚀 GUIDA DEPLOYMENT FACILISSIMA

**Anche se non sai niente di server, segui questa guida PASSO-PASSO.**

Tempo totale: 20 minuti
Costo: €4.51/mese (meno di un caffè)

---

## 📋 COSA SERVE

1. **Email** (quella che usi normalmente)
2. **Carta di credito/debito** (per Hetzner, non verrà addebitato subito)
3. **Wallet Monero** (ti spiego come crearlo in 2 minuti)

---

## PARTE 1: CREA WALLET MONERO (2 minuti)

### Opzione A: MyMonero (veloce, online)

1. Vai su: **https://mymonero.com**
2. Click su **"Create a new wallet"**
3. Scegli password (SALVALA!)
4. Scarica il file di backup
5. **COPIA il tuo indirizzo wallet** (inizia con `4...`)

### Opzione B: Wallet Desktop (più sicuro)

1. Vai su: **https://www.getmonero.org/downloads/**
2. Scarica **Monero GUI** per il tuo sistema
3. Installa e crea nuovo wallet
4. **COPIA il tuo indirizzo principale**

**✅ SALVA IL TUO WALLET IN UN FILE!**

```
Il mio wallet Monero: 4AdUndXHHZ6cfufTMvppY6...
```

---

## PARTE 2: CREA VPS SU HETZNER (10 minuti)

### Step 1: Registrati

1. Vai su: **https://www.hetzner.com/cloud**

2. Click su **"Sign up"** (in alto a destra)

3. Compila form:
   ```
   Email: la tua email
   Password: scegli una password forte
   ```

4. Click **"Create account"**

5. Vai nella tua email e **conferma** (click sul link)

6. Login su Hetzner Cloud Console

---

### Step 2: Aggiungi metodo di pagamento

1. Click su tuo nome (in alto a destra) → **"Billing"**

2. Click **"Payment methods"** → **"Add payment method"**

3. Inserisci dati carta

4. Click **"Save"**

**ℹ️ Non verrà addebitato nulla ora, solo al primo mese di utilizzo**

---

### Step 3: Crea progetto

1. Click **"New project"**

2. Nome progetto: **FasTapMining**

3. Click **"Add project"**

---

### Step 4: Crea server

1. Click **"Add server"**

2. **Location:** Scegli **Falkenstein** (Germania)

3. **Image:** Scegli **Ubuntu 22.04**

4. **Type:** Click su **"Shared vCPU"**

5. **Plan:** Seleziona **CX21**
   ```
   CX21
   2 vCPU AMD
   4 GB RAM
   40 GB SSD
   €4.51/mese
   ```

6. **SSH key (IMPORTANTE!):**

   - **Su Windows:**
     1. Apri PowerShell
     2. Copia-incolla:
        ```powershell
        ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\hetzner_key" -N '""'
        Get-Content "$env:USERPROFILE\.ssh\hetzner_key.pub"
        ```
     3. Copia l'output (inizia con `ssh-ed25519`)

   - **Su Mac/Linux:**
     1. Apri Terminale
     2. Copia-incolla:
        ```bash
        ssh-keygen -t ed25519 -f ~/.ssh/hetzner_key -N ''
        cat ~/.ssh/hetzner_key.pub
        ```
     3. Copia l'output

   - In Hetzner:
     1. Click **"Add SSH key"**
     2. Incolla la chiave
     3. Nome: **my-laptop**
     4. Click **"Add SSH key"**

7. **Server name:** **fasttap-mining-1**

8. Click **"Create & Buy now"**

---

### Step 5: Attendi creazione (1-2 minuti)

Vedrai una barra di caricamento. Quando diventa verde, il server è pronto!

**COPIA L'IP DEL SERVER** (es: `95.217.123.45`)

```
IP del mio server: ___________________
```

---

## PARTE 3: CONNETTITI AL SERVER (2 minuti)

### Su Windows (PowerShell):

```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@TUO_IP_QUI
```

Sostituisci `TUO_IP_QUI` con l'IP che hai copiato.

Esempio:
```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@95.217.123.45
```

### Su Mac/Linux (Terminale):

```bash
ssh -i ~/.ssh/hetzner_key root@TUO_IP_QUI
```

---

**Ti chiederà: "Are you sure you want to continue connecting?"**

Scrivi: **yes** e premi INVIO

✅ Sei dentro il server! Vedrai qualcosa tipo:

```
root@fasttap-mining-1:~#
```

---

## PARTE 4: INSTALLA TUTTO AUTOMATICAMENTE (3 minuti)

### Copia-incolla questi 3 comandi UNO ALLA VOLTA:

**Comando 1:** Scarica script

```bash
wget https://raw.githubusercontent.com/Marcone1983/FasTapMining/main/auto-setup-vps.sh
```

Premi INVIO. Vedrai download completato.

---

**Comando 2:** Rendi eseguibile

```bash
chmod +x auto-setup-vps.sh
```

Premi INVIO.

---

**Comando 3:** ESEGUI (sostituisci con il TUO wallet!)

```bash
./auto-setup-vps.sh TUO_WALLET_MONERO_QUI
```

Esempio:
```bash
./auto-setup-vps.sh 4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge
```

---

### ✅ LO SCRIPT FA TUTTO DA SOLO:

Vedrai:
```
╔════════════════════════════════════════════════════════════╗
║  🚀 FASTTAPMINING - AUTO SETUP                            ║
║  Setup completo VPS + XMRig + Mining Proxy                ║
╚════════════════════════════════════════════════════════════╝

✓ Wallet configurato: 4AdUndXHHZ6cfufTMvppY...
[1/6] Aggiornamento sistema...
✓ Sistema aggiornato
[2/6] Installazione dipendenze...
✓ Dipendenze installate
[3/6] Installazione Node.js e PM2...
✓ Node.js v18.x e PM2 installati
[4/6] Download e configurazione XMRig...
✓ XMRig configurato
[5/6] Setup WebSocket Mining Proxy...
✓ Mining Proxy configurato
[6/6] Avvio servizi con PM2...
✓ Servizi avviati

═══════════════════════════════════════════════════════════
🎉 SETUP COMPLETATO CON SUCCESSO!
═══════════════════════════════════════════════════════════

📊 INFORMAZIONI SISTEMA:

   VPS IP Pubblico:  95.217.123.45
   Wallet Monero:    4AdUndXHHZ6cfufTMvppY...

🔌 SERVIZI ATTIVI:

   ✅ XMRig Mining Server
      Hashrate atteso: 800-2000 H/s
      Pool: gulf.moneroocean.stream:10128

   ✅ WebSocket Mining Proxy
      URL: ws://95.217.123.45:8080?userId=USER_ID
      Porta: 8080
```

---

**QUANDO VEDI QUESTO, HAI FINITO!** 🎉

---

## PARTE 5: VERIFICA CHE FUNZIONI (2 minuti)

### Comando 1: Verifica XMRig

```bash
pm2 logs xmrig-fasttap --lines 20
```

Dovresti vedere:
```
speed 10s/60s/15m 1200.5 1195.3 n/a H/s max 1250.0 H/s
[pool] accepted (12/0) diff 50000 (500 ms)
```

✅ **Se vedi "accepted"** = sta minando!

Premi **CTRL+C** per uscire dai logs.

---

### Comando 2: Verifica Mining Proxy

```bash
pm2 logs mining-proxy --lines 10
```

Dovresti vedere:
```
✅ WebSocket Proxy Server ONLINE on port 8080
   External URL: ws://95.217.123.45:8080?userId=USER_ID
```

✅ **Se vedi "ONLINE"** = proxy funziona!

Premi **CTRL+C** per uscire.

---

### Comando 3: Controlla dashboard pool (dopo 5-10 minuti)

Apri nel browser:

```
https://moneroocean.stream/dashboard?address=TUO_WALLET_QUI
```

Dovresti vedere:
- **Hashrate:** 1000-2000 H/s
- **Shares accepted:** crescente
- **Workers:** 1 online

---

## PARTE 6: CONFIGURA VERCEL (5 minuti)

### Step 1: Vai su Vercel

1. Vai su: **https://vercel.com**
2. Login con GitHub
3. Trova progetto **FasTapMining**
4. Click sul progetto

---

### Step 2: Aggiungi variabile d'ambiente

1. Click **"Settings"** (in alto)
2. Click **"Environment Variables"** (sidebar sinistra)
3. Aggiungi nuova variabile:

   ```
   Name: MINING_PROXY_URL
   Value: TUO_IP_VPS:8080
   ```

   Esempio:
   ```
   Name: MINING_PROXY_URL
   Value: 95.217.123.45:8080
   ```

4. Click **"Add"**

5. Click **"Redeploy"** (in alto a destra)

6. Conferma redeploy

---

### ✅ DEPLOYMENT COMPLETATO!

Dopo 2-3 minuti, vai su:

```
https://tuo-app.vercel.app
```

Apri la Mini App in Telegram e:

1. Vai nella sezione **"Mining"**
2. Scroll in basso fino a **"⚡ Boost Your Mining"**
3. Click **"Start Client Mining"**
4. Dovresti vedere:
   ```
   ✅ Client Mining Active (2-5 H/s)
   ```

---

## 🎉 HAI FINITO!

### RIEPILOGO FINALE:

✅ **VPS Hetzner:** Mining server + WebSocket proxy attivi
✅ **XMRig:** Sta minando Monero 24/7 (1000-2000 H/s)
✅ **Mining Proxy:** Permette client mining da browser
✅ **Vercel:** Frontend deployato e connesso

### COSTI:

- VPS Hetzner: **€4.51/mese** (addebitato mensilmente)
- Vercel: **€0** (piano gratuito)
- **TOTALE: €4.51/mese**

### GUADAGNI:

- Hashrate totale: **2000-4000 H/s**
- XMR minato al mese: **~0.08 XMR**
- Valore (XMR @ $150): **~$12/mese**
- **PROFITTO NETTO: ~$7/mese**

---

## 📊 COMANDI UTILI DA RICORDARE

### Per connetterti di nuovo al server:

**Windows:**
```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@TUO_IP
```

**Mac/Linux:**
```bash
ssh -i ~/.ssh/hetzner_key root@TUO_IP
```

---

### Una volta connesso:

**Vedere status servizi:**
```bash
pm2 list
```

**Vedere logs XMRig:**
```bash
pm2 logs xmrig-fasttap
```

**Vedere logs Mining Proxy:**
```bash
pm2 logs mining-proxy
```

**Monitor in tempo reale:**
```bash
pm2 monit
```

**Riavviare tutto:**
```bash
pm2 restart all
```

---

## 🆘 TROUBLESHOOTING

### Problema: "Permission denied" quando faccio SSH

**Soluzione:**
```bash
# Windows
icacls "$env:USERPROFILE\.ssh\hetzner_key" /inheritance:r /grant:r "$env:USERNAME:R"

# Mac/Linux
chmod 600 ~/.ssh/hetzner_key
```

---

### Problema: XMRig non mina (hashrate = 0)

**Soluzione:**
```bash
pm2 restart xmrig-fasttap
pm2 logs xmrig-fasttap
```

Cerca errori. Se vedi "SOCKET ERROR", controlla firewall.

---

### Problema: Client mining non si connette

**Soluzione:**

1. Verifica che proxy sia online:
   ```bash
   pm2 logs mining-proxy
   ```

2. Apri porta 8080 su Hetzner:
   ```bash
   sudo ufw allow 8080
   sudo ufw reload
   ```

3. Testa da browser:
   ```
   http://TUO_IP:8080
   ```
   Dovresti vedere: "FasTapMining WebSocket Proxy Server - ONLINE"

---

### Problema: Pool dashboard non mostra hashrate

**Aspetta 10-15 minuti.** Il pool aggiorna ogni ~10 minuti.

Se dopo 30 minuti ancora niente:

```bash
pm2 logs xmrig-fasttap --lines 50
```

Cerca "accepted" o "rejected". Se vedi solo "rejected", c'è problema con wallet.

---

## 📞 SUPPORTO

Se hai problemi:

1. **GitHub Issues:** https://github.com/Marcone1983/FasTapMining/issues
2. **Controlla logs:** `pm2 logs` è tuo amico
3. **Pool dashboard:** https://moneroocean.stream/dashboard

---

## 🎯 PROSSIMI STEP (opzionali)

### Dominio personalizzato (invece di IP):

1. Compra dominio su **Cloudflare** (~$10/anno)
2. Aggiungi record DNS:
   ```
   Type: A
   Name: mining
   Value: TUO_IP_VPS
   ```
3. In Vercel, cambia `MINING_PROXY_URL` a: `mining.tuodominio.com:8080`

---

### SSL per WebSocket (wss:// invece di ws://):

Vedi guida avanzata: `REALISTIC_MINING_ARCHITECTURE.md`

---

## ✅ FATTO!

Congratulazioni! Hai deployato un sistema di mining completo.

**Ricordati:**
- Controlla il dashboard pool ogni giorno
- Verifica che VPS sia attivo: `pm2 list`
- Il mining è passivo: funziona 24/7 automaticamente

🚀 **Happy mining!**
