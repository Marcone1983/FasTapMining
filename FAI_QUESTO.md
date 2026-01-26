# ✅ FAI QUESTO - IN ORDINE

**Copia-incolla questi comandi UNO ALLA VOLTA.**

---

## PARTE 1: WALLET MONERO (2 minuti)

### Vai su questo link:
```
https://mymonero.com
```

### Click su: **"Create a new wallet"**

### Scegli password e SCARICA il backup

### **COPIA L'INDIRIZZO** (inizia con `4...`)

Esempio:
```
4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge
```

**SALVALO in un file di testo!**

---

## PARTE 2: VPS HETZNER (10 minuti)

### 1. Registrati su Hetzner:
```
https://www.hetzner.com/cloud
```

- Click "Sign up"
- Inserisci email e password
- Conferma email

---

### 2. Aggiungi carta di credito:

- Login
- Click tuo nome → "Billing"
- "Payment methods" → "Add payment method"
- Inserisci dati carta

---

### 3. Crea progetto:

- Click "New project"
- Nome: **FasTapMining**
- Click "Add project"

---

### 4. Crea SSH key:

**SU WINDOWS** - Apri PowerShell e copia-incolla:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\hetzner_key" -N '""'
Get-Content "$env:USERPROFILE\.ssh\hetzner_key.pub"
```

**SU MAC/LINUX** - Apri Terminale e copia-incolla:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_key -N ''
cat ~/.ssh/hetzner_key.pub
```

**COPIA L'OUTPUT** (inizia con `ssh-ed25519`)

---

### 5. Crea server:

- Click "Add server"
- **Location:** Falkenstein
- **Image:** Ubuntu 22.04
- **Type:** Shared vCPU
- **Plan:** CX21 (€4.51/mese)
- **SSH key:**
  - Click "Add SSH key"
  - Incolla la chiave che hai copiato prima
  - Nome: my-key
  - Click "Add SSH key"
- **Name:** fasttap-mining
- Click "Create & Buy now"

---

### 6. COPIA L'IP DEL SERVER

Quando il server è pronto (diventa verde), vedrai un IP tipo:

```
95.217.123.45
```

**COPIALO E SALVALO!**

```
Il mio IP VPS: ___________________
```

---

## PARTE 3: CONNETTITI E INSTALLA (5 minuti)

### 1. Connettiti al server:

**SU WINDOWS** - PowerShell:

```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@TUO_IP_QUI
```

Sostituisci `TUO_IP_QUI` con l'IP che hai copiato.

Esempio:
```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@95.217.123.45
```

**SU MAC/LINUX** - Terminale:

```bash
ssh -i ~/.ssh/hetzner_key root@TUO_IP_QUI
```

Esempio:
```bash
ssh -i ~/.ssh/hetzner_key root@95.217.123.45
```

---

Ti chiederà: **"Are you sure you want to continue connecting?"**

Scrivi: **yes** e premi INVIO

---

### 2. COPIA-INCOLLA QUESTI 3 COMANDI (uno alla volta):

**Comando 1:**
```bash
wget https://raw.githubusercontent.com/Marcone1983/FasTapMining/main/auto-setup-vps.sh
```

Premi INVIO. Aspetta che finisca.

---

**Comando 2:**
```bash
chmod +x auto-setup-vps.sh
```

Premi INVIO.

---

**Comando 3 (SOSTITUISCI CON IL TUO WALLET!):**

```bash
./auto-setup-vps.sh TUO_WALLET_MONERO_QUI
```

Esempio VERO:
```bash
./auto-setup-vps.sh 4AdUndXHHZ6cfufTMvppY6JwXNouMBzSkbLYfpAV5Usx3skxNgYeYTRj5UzqtReoS44qo9mtmXCqY45DJ852K5Jv2684Rge
```

Premi INVIO.

---

### ✅ ASPETTA CHE FINISCA (3-5 minuti)

Vedrai:

```
╔════════════════════════════════════════════════════════════╗
║  🚀 FASTTAPMINING - AUTO SETUP                            ║
╚════════════════════════════════════════════════════════════╝

[1/6] Aggiornamento sistema...
✓ Sistema aggiornato
[2/6] Installazione dipendenze...
✓ Dipendenze installate
...
...
🎉 SETUP COMPLETATO CON SUCCESSO!
```

---

### 3. Quando vedi "SETUP COMPLETATO", COPIA QUESTO:

Vedrai qualcosa tipo:

```
📊 INFORMAZIONI SISTEMA:
   VPS IP Pubblico:  95.217.123.45
   Wallet Monero:    4AdUndXHHZ6cf...

⚙️ CONFIGURAZIONE FRONTEND:
   MINING_PROXY_URL=95.217.123.45:8080
```

**COPIA IL TUO:** `TUO_IP:8080`

Esempio: `95.217.123.45:8080`

**SALVALO!**

```
Il mio MINING_PROXY_URL: ___________________
```

---

## PARTE 4: CONFIGURA VERCEL (3 minuti)

### 1. Vai su Vercel:
```
https://vercel.com
```

### 2. Login con GitHub

### 3. Trova progetto **FasTapMining** e clicka sopra

### 4. Click **"Settings"** (in alto)

### 5. Click **"Environment Variables"** (sidebar sinistra)

### 6. Aggiungi variabile:

```
Name: MINING_PROXY_URL
Value: TUO_IP:8080
```

**SOSTITUISCI con quello che hai salvato prima!**

Esempio:
```
Name: MINING_PROXY_URL
Value: 95.217.123.45:8080
```

### 7. Click **"Add"**

### 8. Click **"Deployments"** (in alto)

### 9. Click sui 3 puntini dell'ultimo deployment → **"Redeploy"**

### 10. Click **"Redeploy"** per confermare

---

## ✅ HAI FINITO!

### ASPETTA 2-3 MINUTI, POI:

1. Vai su Telegram
2. Apri il tuo bot FasTapMining
3. Vai nella sezione "Mining"
4. Scroll in basso fino a "⚡ Boost Your Mining"
5. Click "Start Client Mining"

Dovresti vedere:
```
✅ Client Mining Active (2-5 H/s)
```

---

### CONTROLLA GUADAGNI:

Dopo 10-15 minuti, vai su:

```
https://moneroocean.stream/dashboard?address=TUO_WALLET_QUI
```

Dovresti vedere:
- Hashrate: 1000-2000 H/s
- Shares: accepted
- Workers: online

---

## 🎉 COMPLIMENTI!

**HAI DEPLOYATO UN SISTEMA DI MINING COMPLETO!**

### Costi:
- VPS: €4.51/mese (addebitato mensilmente)

### Guadagni:
- ~$12/mese da mining
- **PROFITTO: ~$7/mese**

---

## 📞 SE HAI PROBLEMI:

**Leggi la guida completa:**
- https://github.com/Marcone1983/FasTapMining/blob/main/GUIDA_DEPLOYMENT_FACILE.md

**Sezione Troubleshooting:**
- https://github.com/Marcone1983/FasTapMining/blob/main/GUIDA_DEPLOYMENT_FACILE.md#-troubleshooting

**GitHub Issues:**
- https://github.com/Marcone1983/FasTapMining/issues

---

## 🚀 BUON MINING!
