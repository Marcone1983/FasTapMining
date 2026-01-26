# ⚡ QUICK START - 3 COMANDI

**Se non vuoi leggere guide lunghe, fai solo questo:**

---

## 1️⃣ CREA WALLET MONERO (2 min)

Vai su: **https://mymonero.com** → Create wallet → **COPIA indirizzo**

---

## 2️⃣ CREA VPS HETZNER (5 min)

1. **Registrati:** https://www.hetzner.com/cloud
2. **Crea server:**
   - Location: Falkenstein
   - Image: Ubuntu 22.04
   - Type: CX21 (€4.51/mese)
   - Crea SSH key (vedi sotto)
3. **COPIA IP SERVER**

### Crea SSH key:

**Windows (PowerShell):**
```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\hetzner_key" -N '""'
Get-Content "$env:USERPROFILE\.ssh\hetzner_key.pub"
```

**Mac/Linux (Terminale):**
```bash
ssh-keygen -t ed25519 -f ~/.ssh/hetzner_key -N ''
cat ~/.ssh/hetzner_key.pub
```

Copia output e incollalo in Hetzner → Add SSH key

---

## 3️⃣ INSTALLA TUTTO (3 min)

### Connettiti al server:

**Windows:**
```powershell
ssh -i $env:USERPROFILE\.ssh\hetzner_key root@TUO_IP_QUI
```

**Mac/Linux:**
```bash
ssh -i ~/.ssh/hetzner_key root@TUO_IP_QUI
```

(Sostituisci `TUO_IP_QUI` con IP del server)

---

### Copia-incolla questi 3 comandi:

```bash
wget https://raw.githubusercontent.com/Marcone1983/FasTapMining/main/auto-setup-vps.sh
chmod +x auto-setup-vps.sh
./auto-setup-vps.sh TUO_WALLET_MONERO_QUI
```

(Sostituisci `TUO_WALLET_MONERO_QUI` con il wallet che hai creato)

---

### ✅ FATTO!

Aspetta 5 minuti, lo script fa tutto automaticamente.

Quando vedi:
```
🎉 SETUP COMPLETATO CON SUCCESSO!
```

Sei pronto!

---

## 4️⃣ CONFIGURA VERCEL (2 min)

1. Vai su **https://vercel.com**
2. Login con GitHub
3. Trova progetto **FasTapMining**
4. Settings → Environment Variables
5. Aggiungi:
   ```
   Name: MINING_PROXY_URL
   Value: TUO_IP_VPS:8080
   ```
6. Redeploy

---

## ✅ HAI FINITO!

Vai su Telegram → Apri bot → Mining → "Start Client Mining"

**Controlla guadagni:**
https://moneroocean.stream/dashboard?address=TUO_WALLET

---

## 📖 GUIDE COMPLETE:

- **Dettagliatissima:** [GUIDA_DEPLOYMENT_FACILE.md](./GUIDA_DEPLOYMENT_FACILE.md)
- **Tecnica:** [REALISTIC_MINING_ARCHITECTURE.md](./REALISTIC_MINING_ARCHITECTURE.md)
- **Compliance:** [COMPLIANCE_CHECKLIST.md](./COMPLIANCE_CHECKLIST.md)

---

**TOTALE TEMPO:** 15 minuti
**COSTO:** €4.51/mese
**GUADAGNO:** ~$12/mese = **+$7/mese profitto**

🚀 **Enjoy mining!**
