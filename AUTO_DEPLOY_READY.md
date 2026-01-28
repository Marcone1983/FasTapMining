# ✅ AUTO-DEPLOY FIXED - PRONTO PER L'USO!

**Status:** 🟢 GitHub Actions RIABILITATO
**Manca:** Solo configurare i secrets (5 minuti)

---

## 🚀 SETUP VELOCE (METODO AUTOMATICO)

### **Opzione 1: Script Automatico** ⚡ VELOCE

```bash
# Vai nella directory progetto
cd /data/data/com.termux/files/home/FasTapMining

# Esegui lo script
./setup-vercel-secrets.sh
```

**Lo script fa TUTTO automaticamente:**
1. ✅ Installa Vercel CLI (se manca)
2. ✅ Link progetto Vercel
3. ✅ Estrae ORG_ID e PROJECT_ID
4. ✅ Ti chiede il VERCEL_TOKEN
5. ✅ Configura TUTTI i secrets su GitHub
6. ✅ Done! 🎉

**Tempo:** 2-3 minuti

---

## 🛠️ SETUP MANUALE (Se preferisci)

### Step 1: Crea Vercel Token

1. Vai su: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: `GitHub Actions Deploy`
4. Scope: `Full Account`
5. **COPIA IL TOKEN!** (lo vedi solo una volta)

### Step 2: Ottieni Vercel IDs

```bash
npm i -g vercel
vercel login
vercel link
cat .vercel/project.json
```

Copia `orgId` e `projectId`

### Step 3: Aggiungi Secrets su GitHub

Vai su: https://github.com/Marcone1983/FasTapMining/settings/secrets/actions

Aggiungi questi 5 secrets:

1. **VERCEL_TOKEN** = (il token che hai creato)
2. **VERCEL_ORG_ID** = (da .vercel/project.json)
3. **VERCEL_PROJECT_ID** = (da .vercel/project.json)
4. **DATABASE_URL** = (dal tuo .env)
5. **WEBAPP_URL** = https://fas-tap-mining.vercel.app

---

## ✅ VERIFICA CHE FUNZIONI

Dopo aver configurato i secrets:

```bash
# Test auto-deploy
git commit --allow-empty -m "test: verify auto-deploy"
git push origin main
```

**Vai su:**
```
https://github.com/Marcone1983/FasTapMining/actions
```

**Dovresti vedere:**
- ✅ Workflow "Deploy to Production" in esecuzione
- ✅ Dopo 2-3 minuti → Deploy completato
- ✅ App live su https://fas-tap-mining.vercel.app

---

## 🎯 COME FUNZIONA DOPO IL SETUP

**Workflow automatico:**
```
1. Tu fai modifiche al codice
2. git push origin main
3. GitHub Actions si attiva automaticamente
4. Build & Deploy su Vercel
5. App aggiornata in 2-3 minuti!
```

**Nessun comando manuale!** 🚀

---

## 📊 FILE MODIFICATI

**Workflow riabilitato:**
```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches:
      - main  # ✅ Auto-deploy attivo!
```

**Guide create:**
- ✅ `SETUP_GITHUB_SECRETS.md` - Guida completa passo-passo
- ✅ `setup-vercel-secrets.sh` - Script automatico
- ✅ `AUTO_DEPLOY_READY.md` - Questo file

---

## 🐛 TROUBLESHOOTING

### Workflow fallisce con "Input required: vercel-token"?

**Significa che i secrets non sono configurati.**

**Fix:**
```bash
# Metodo veloce
./setup-vercel-secrets.sh

# O manuale
https://github.com/Marcone1983/FasTapMining/settings/secrets/actions
→ Aggiungi i 5 secrets
```

### Script chiede "gh CLI not installed"?

```bash
pkg install gh
gh auth login
# Segui le istruzioni per autenticarti
```

### Vercel CLI non si installa?

```bash
npm i -g vercel --force
```

---

## ✅ CHECKLIST FINALE

- [ ] Eseguito `./setup-vercel-secrets.sh` (o setup manuale)
- [ ] Tutti e 5 i secrets configurati su GitHub
- [ ] Test push fatto
- [ ] Workflow completato con successo
- [ ] App deployata su Vercel

**Quando tutto è ✅ → AUTO-DEPLOY ATTIVO! 🎉**

---

## 📝 COMMITS

```
8c9cafc - 🔧 FIX: Re-enable GitHub Actions + Add secrets setup guide
[next] - 🚀 ADD: Auto-setup script for GitHub Secrets
```

**Pushed to:** https://github.com/Marcone1983/FasTapMining

---

**TUTTO PRONTO!** Esegui `./setup-vercel-secrets.sh` e in 3 minuti hai l'auto-deploy! 🚀

---

**Last Updated:** 2026-01-28 17:40
**Status:** 🟢 Ready for Setup
