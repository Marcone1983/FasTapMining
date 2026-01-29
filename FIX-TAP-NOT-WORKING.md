# 🔧 FIX: Tap Resta a 0 - Guida Completa

**Problema:** Tapping non aggiorna stats (tutto resta a 0)

**Causa:** Database non configurato correttamente / Tabelle mancanti

---

## ✅ SOLUZIONE COMPLETA (Segui nell'ordine)

### **STEP 1: Verifica Tabelle in Supabase**

1. Apri **Supabase Dashboard**: https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Click su **SQL Editor** (menu laterale sinistro)
4. Click su **+ New Query**
5. **Copia e incolla** TUTTO il contenuto di:
   ```
   database/verify-tables.sql
   ```
6. Click **Run** (o CMD/CTRL + Enter)

**Risultato Atteso:**
```sql
table_name              | status
------------------------+-------------
blocks                  | ✅ Required
lifetime_access_payments| ✅ Required
marketplace_purchases   | ✅ Required
mining_pools            | ✅ Required
mining_shares           | ✅ Required
referrals               | ✅ Required
transactions            | ✅ Required
user_balances           | ✅ Required
users                   | ✅ Required
```

**Se NON vedi tutte queste tabelle:**
→ Vai allo **STEP 2**

**Se vedi tutte le tabelle:**
→ Vai allo **STEP 3**

---

### **STEP 2: Creare Tabelle Mancanti**

1. Nella **stessa SQL Editor** window
2. Click **+ New Query**
3. **Copia e incolla** TUTTO il contenuto di:
   ```
   database/EXECUTE-ALL-TABLES-NOW.sql
   ```
4. Click **Run** (aspetta 10-15 secondi, è normale)
5. Verifica output: dovresti vedere "CREATE TABLE" per ogni tabella

**Verifica che sia andato a buon fine:**
1. Torna a **SQL Editor** → **+ New Query**
2. Esegui:
   ```sql
   SELECT * FROM mining_pools WHERE id = 'viabtc';
   ```
3. **DEVE mostrare** la pool ViaBTC:
   ```
   id: viabtc
   name: ViaBTC Scrypt
   token: LTC+DOGE+BELLS+LKY+PEP+JKC+DINGO+SHIC
   is_active: true
   ```

**Se NON vedi la pool:**
→ Le tabelle non sono state create correttamente
→ Ripeti STEP 2 o contattami

**Se vedi la pool:**
→ ✅ Database OK! Vai allo STEP 3

---

### **STEP 3: Configura Variabili Ambiente in Vercel**

**CRITICO:** Se le variabili ambiente non sono configurate, l'API non può connettersi al database!

1. Vai su **Vercel Dashboard**: https://vercel.com/dashboard
2. Seleziona progetto **fas-tap-mining** (o il tuo nome progetto)
3. Click **Settings** (menu in alto)
4. Click **Environment Variables** (menu laterale sinistro)

**Verifica che TUTTE queste variabili esistano:**

#### **Database Variables:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DB_HOST=db.YOUR_PROJECT.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_DATABASE_PASSWORD
```

**Come trovarle:**
1. Apri **Supabase** → Seleziona progetto
2. Click **Settings** (icona ingranaggio)
3. Click **API**
4. Copia:
   - **URL** → `SUPABASE_URL`
   - **anon/public key** → `SUPABASE_KEY`
5. Click **Database** (nel menu Settings)
6. Copia:
   - **Host** → `DB_HOST`
   - **Database name** → `DB_NAME`
   - **Port** → `DB_PORT` (sempre 5432)
   - **User** → `DB_USER` (sempre postgres)
   - **Password** → `DB_PASSWORD` (la password che hai settato tu)

#### **Owner & Bot Variables:**
```bash
TOKEN_API_BOT=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
OWNER_TELEGRAM_IDS=856208904
OWNER_WALLET_TON=UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR
TONCENTER_API_KEY=your_toncenter_api_key
WEBAPP_URL=https://fas-tap-mining.vercel.app
NODE_ENV=production
```

**Come trovarle:**
- `TOKEN_API_BOT`: Da @BotFather su Telegram
- `OWNER_TELEGRAM_IDS`: Il tuo Telegram User ID (856208904)
- `OWNER_WALLET_TON`: Il tuo wallet TON
- `TONCENTER_API_KEY`: https://toncenter.com → Get API Key
- `WEBAPP_URL`: URL del tuo deploy Vercel

#### **Admin Key:**
```bash
ADMIN_KEY=<generate random string>
```

**Genera admin key sicura:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**IMPORTANTE:**
- Ogni variabile deve essere configurata per **Production**, **Preview**, **Development**
- Dopo aver aggiunto TUTTE le variabili → Click **Save**

---

### **STEP 4: Rideploy Vercel**

**CRITICO:** Vercel DEVE fare redeploy per usare le nuove variabili!

1. Resta su **Vercel Dashboard** → Tuo progetto
2. Click **Deployments** (menu in alto)
3. Click sui **3 puntini** (⋮) del deployment più recente
4. Click **Redeploy**
5. Seleziona **Use existing Build Cache** → Click **Redeploy**
6. Aspetta 1-2 minuti che finisca

**Verifica deploy OK:**
1. Quando deployment è verde ✅
2. Click sul deployment → Click **Visit**
3. URL: `https://fas-tap-mining.vercel.app/api/health`
4. **DEVE rispondere:**
   ```json
   {
     "status": "healthy",
     "checks": {
       "database": { "status": "healthy" },
       "environment": { "status": "healthy" }
     }
   }
   ```

**Se health NON è healthy:**
→ Variabili ambiente sbagliate!
→ Torna allo STEP 3 e controlla tutte le variabili

---

### **STEP 5: Test Tap in Mini App**

1. Apri Telegram → Il tuo bot
2. `/start` → Click **⛏️ Start Mining**
3. Mini app si apre
4. **Fai 10 tap** sulla zona centrale
5. **Aspetta 2-3 secondi**
6. **Verifica:**
   - `Total Taps` deve mostrare **10** (o più se hai fatto più tap)
   - `H/s` (Hashrate) deve mostrare un numero > 0
   - `Shares` deve mostrare un numero > 0

**Se ANCORA tutto a 0:**
→ Vai allo **STEP 6** (Debug Logs)

**Se funziona:**
→ ✅✅✅ **PROBLEMA RISOLTO!** 🎉

---

### **STEP 6: Debug Logs (Se ancora non funziona)**

1. Apri **Vercel Dashboard** → Tuo progetto
2. Click **Logs** (menu in alto)
3. Click **Functions**
4. Filtra per: `/api/mining`
5. Fai alcuni tap nell'app
6. **Guarda i log in real-time**

**Errori comuni:**

#### **"Cannot connect to database"**
→ Variabili DB_* sbagliate in Vercel
→ Torna allo STEP 3

#### **"relation 'mining_pools' does not exist"**
→ Tabelle non create
→ Torna allo STEP 2

#### **"Invalid or inactive pool"**
→ Pool 'viabtc' non esiste
→ Esegui in Supabase:
```sql
INSERT INTO mining_pools (id, name, token, difficulty, block_reward, weight, is_active)
VALUES ('viabtc', 'ViaBTC Scrypt', 'LTC+DOGE+BELLS+LKY+PEP+JKC+DINGO+SHIC', 65536, 100, 1.0, TRUE)
ON CONFLICT (id) DO UPDATE SET is_active = TRUE;
```

#### **"User not found" / No errors but 0 stats**
→ Frontend non invia userId correttamente
→ Apri DevTools (F12) → Network → Fai tap
→ Guarda la request a `/api/mining`
→ Verifica che `userId` sia presente nel body

---

### **STEP 7: Verifica Database Manuale**

Se hai fatto tap ma stats = 0, controlla database:

1. Apri **Supabase** → **SQL Editor**
2. Esegui:
   ```sql
   -- Verifica se user è stato creato
   SELECT * FROM users WHERE telegram_id = '856208904';

   -- Verifica se shares sono state aggiunte
   SELECT * FROM mining_shares
   WHERE user_id = (SELECT id FROM users WHERE telegram_id = '856208904')
   ORDER BY created_at DESC
   LIMIT 10;

   -- Verifica pool esiste
   SELECT * FROM mining_pools WHERE id = 'viabtc';
   ```

**Risultato atteso:**
- `users`: 1 riga con i tuoi dati
- `mining_shares`: Righe con shares > 0
- `mining_pools`: 1 riga con viabtc pool

**Se users o mining_shares è vuoto:**
→ API mining NON funziona
→ Controlla logs Vercel (STEP 6)

---

## 🆘 QUICK FIX (Se hai fretta)

**Opzione nucleare: Ricrea tutto da zero**

1. **Supabase:**
   ```sql
   -- Elimina tutto
   DROP TABLE IF EXISTS mining_shares CASCADE;
   DROP TABLE IF EXISTS blocks CASCADE;
   DROP TABLE IF EXISTS marketplace_purchases CASCADE;
   DROP TABLE IF EXISTS lifetime_access_payments CASCADE;
   DROP TABLE IF EXISTS user_balances CASCADE;
   DROP TABLE IF EXISTS transactions CASCADE;
   DROP TABLE IF EXISTS referrals CASCADE;
   DROP TABLE IF EXISTS mining_pools CASCADE;
   DROP TABLE IF EXISTS users CASCADE;

   -- Ricrea tutto
   -- Poi esegui TUTTO il contenuto di EXECUTE-ALL-TABLES-NOW.sql
   ```

2. **Vercel:**
   - Vai in Settings → Environment Variables
   - Click **Remove All**
   - Aggiungi di nuovo TUTTE le variabili (vedi STEP 3)
   - Redeploy

3. **Bot:**
   ```bash
   pm2 restart fastap-bot
   ```

4. **Test di nuovo**

---

## ✅ CHECKLIST FINALE

Prima di contattarmi, verifica che:

- [ ] Ho eseguito `database/EXECUTE-ALL-TABLES-NOW.sql` in Supabase
- [ ] Ho verificato che 9 tabelle esistono (verify-tables.sql)
- [ ] Pool 'viabtc' esiste ed è `is_active = true`
- [ ] TUTTE le variabili ambiente sono in Vercel (Production + Preview + Development)
- [ ] Database password corretta in `DB_PASSWORD`
- [ ] Fatto Redeploy su Vercel DOPO aver aggiunto variabili
- [ ] `/api/health` risponde "healthy"
- [ ] Ho fatto tap e aspettato 3-5 secondi
- [ ] Ho controllato i logs Vercel durante il tap

**Se TUTTE le checkbox sono ✅ e ANCORA non funziona:**
→ Mandami screenshot di:
1. Supabase → Table List
2. Vercel → Environment Variables
3. Vercel → Function Logs durante tap
4. Mini app dopo aver fatto tap

---

**Fatto tutto questo?** Dimmi quale STEP ha dato problemi e ti aiuto! 🚀
