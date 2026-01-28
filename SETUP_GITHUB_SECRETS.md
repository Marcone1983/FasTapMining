# 🔐 SETUP GITHUB SECRETS - GUIDA RAPIDA

**Serve per:** Auto-deploy su Vercel quando pusshi su GitHub
**Tempo:** 5-10 minuti

---

## 📋 SECRETS NECESSARI

Il workflow GitHub Actions ha bisogno di questi 5 secrets:

1. ✅ `VERCEL_TOKEN` - Token per deployare
2. ✅ `VERCEL_ORG_ID` - ID organizzazione Vercel
3. ✅ `VERCEL_PROJECT_ID` - ID progetto
4. ✅ `DATABASE_URL` - URL database PostgreSQL
5. ✅ `WEBAPP_URL` - URL app deployata

---

## 🚀 STEP 1: OTTIENI VERCEL_TOKEN

### Via Browser:

1. **Vai su Vercel:**
   ```
   https://vercel.com/account/tokens
   ```

2. **Login con GitHub**

3. **Create New Token:**
   - Click "Create"
   - Name: `GitHub Actions Deploy`
   - Scope: `Full Account`
   - Expiration: `No Expiration`
   - Click "Create Token"

4. **COPIA IL TOKEN!** ⚠️ Lo vedi solo UNA volta!
   ```
   Esempio: vercel_abc123xyz789...
   ```

---

## 🚀 STEP 2: OTTIENI VERCEL ORG ID & PROJECT ID

### Metodo A: Via Vercel CLI (Veloce)

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Vai nella directory progetto
cd /data/data/com.termux/files/home/FasTapMining

# Link al progetto (se non l'hai già fatto)
vercel link

# I secrets sono in questo file:
cat .vercel/project.json
```

**Output esempio:**
```json
{
  "orgId": "team_abc123xyz",
  "projectId": "prj_xyz789abc"
}
```

**Copia questi valori!**

### Metodo B: Via Vercel Dashboard (Manuale)

1. **Vai su Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Apri il tuo progetto** (FasTapMining)

3. **Settings → General:**
   - Scroll in basso
   - Trovi `Project ID` (copia)

4. **Team/Account Settings:**
   - Click sul tuo profilo (top-right)
   - Settings
   - Trovi `Team ID` o `User ID` (copia)

---

## 🚀 STEP 3: AGGIUNGI I SECRETS SU GITHUB

1. **Vai sul tuo repo GitHub:**
   ```
   https://github.com/Marcone1983/FasTapMining/settings/secrets/actions
   ```

2. **Click "New repository secret"** per ciascuno:

### SECRET 1: VERCEL_TOKEN
```
Name: VERCEL_TOKEN
Value: [Il token che hai copiato da Vercel]
```

### SECRET 2: VERCEL_ORG_ID
```
Name: VERCEL_ORG_ID
Value: team_abc123xyz (il tuo orgId)
```

### SECRET 3: VERCEL_PROJECT_ID
```
Name: VERCEL_PROJECT_ID
Value: prj_xyz789abc (il tuo projectId)
```

### SECRET 4: DATABASE_URL
```
Name: DATABASE_URL
Value: postgresql://postgres:DggOFcFM9kKuOkFt@db.rjrayejemhxuqpydwgcd.supabase.co:5432/postgres
```
*(Prendilo dal tuo .env file)*

### SECRET 5: WEBAPP_URL
```
Name: WEBAPP_URL
Value: https://fas-tap-mining.vercel.app
```

---

## ✅ STEP 4: TESTA IL WORKFLOW

1. **Fai un push qualsiasi:**
   ```bash
   echo "test" >> README.md
   git add README.md
   git commit -m "test: verify auto-deploy"
   git push origin main
   ```

2. **Vai su GitHub Actions:**
   ```
   https://github.com/Marcone1983/FasTapMining/actions
   ```

3. **Verifica che il workflow parta**
   - Dovresti vedere "Deploy to Production" in esecuzione
   - Clicca per vedere i logs
   - Attendi 2-3 minuti

4. **Se va in errore:**
   - Leggi i logs per capire quale secret manca
   - Aggiungilo su GitHub
   - Ri-trigga il workflow: "Re-run failed jobs"

---

## 🔍 VERIFICA SECRETS CONFIGURATI

**Dopo aver aggiunto tutti i secrets:**

```
https://github.com/Marcone1983/FasTapMining/settings/secrets/actions
```

**Dovresti vedere 5 secrets:**
- ✅ DATABASE_URL
- ✅ VERCEL_ORG_ID
- ✅ VERCEL_PROJECT_ID
- ✅ VERCEL_TOKEN
- ✅ WEBAPP_URL

**NON puoi vedere i valori** (sono criptati), ma vedi i nomi.

---

## ⚡ QUICK SETUP (Se hai Vercel CLI)

```bash
# 1. Installa Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link progetto
cd /data/data/com.termux/files/home/FasTapMining
vercel link

# 4. Ottieni secrets
cat .vercel/project.json

# Output:
# {
#   "orgId": "team_...",    ← VERCEL_ORG_ID
#   "projectId": "prj_..."  ← VERCEL_PROJECT_ID
# }

# 5. Crea token su https://vercel.com/account/tokens
# 6. Aggiungi tutti e 5 i secrets su GitHub (link sopra)
# 7. Push e testa!
```

---

## 🐛 TROUBLESHOOTING

### Errore: "Input required and not supplied: vercel-token"
**Soluzione:** Hai dimenticato di aggiungere `VERCEL_TOKEN` su GitHub
```
https://github.com/Marcone1983/FasTapMining/settings/secrets/actions
→ Add VERCEL_TOKEN
```

### Errore: "Invalid token"
**Soluzione:** Il token è scaduto o sbagliato
```
1. Vai su https://vercel.com/account/tokens
2. Delete old token
3. Create new token
4. Update VERCEL_TOKEN su GitHub
```

### Errore: "Project not found"
**Soluzione:** VERCEL_PROJECT_ID sbagliato
```
vercel link
cat .vercel/project.json
→ Copia il projectId corretto
→ Update su GitHub
```

### Deploy va OK ma app non funziona?
**Soluzione:** Environment variables mancanti su Vercel
```
1. Vai su Vercel Dashboard
2. Project → Settings → Environment Variables
3. Aggiungi TUTTE le variabili dal .env:
   - TOKEN_API_BOT
   - DATABASE_URL
   - OWNER_WALLET_TON
   - TONCENTER_API_KEY
   - ADMIN_KEY
   - etc.
4. Redeploy
```

---

## 🎯 RISULTATO FINALE

Dopo aver configurato i secrets:

```
1. Fai modifiche al codice
2. git push origin main
3. GitHub Actions si attiva automaticamente
4. Deploya su Vercel
5. App live in 2-3 minuti!
```

**Nessun comando manuale necessario!** 🚀

---

## 📝 COMANDI UTILI

**Check workflow status:**
```bash
# Via browser
https://github.com/Marcone1983/FasTapMining/actions

# Via CLI (se hai gh installato)
gh workflow list
gh run list
gh run view <run-id>
```

**Force re-run workflow:**
```bash
gh run rerun <run-id>
```

**Check Vercel deployments:**
```bash
vercel ls
vercel inspect <deployment-url>
```

---

## ✅ CHECKLIST COMPLETA

- [ ] Creato VERCEL_TOKEN su https://vercel.com/account/tokens
- [ ] Ottenuto VERCEL_ORG_ID e VERCEL_PROJECT_ID (via CLI o dashboard)
- [ ] Aggiunto tutti e 5 i secrets su GitHub
- [ ] Verificato che i secrets siano visibili su GitHub
- [ ] Fatto test push per verificare auto-deploy
- [ ] Workflow completato con successo
- [ ] App deployata e funzionante su Vercel

**Quando tutto è ✅ → Auto-deploy attivo! 🎉**

---

**Last Updated:** 2026-01-28 17:35
**Guide for:** GitHub Actions + Vercel Auto-Deploy
