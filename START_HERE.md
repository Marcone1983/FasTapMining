# 🚀 FasTap Mining - START HERE!

## ✅ TUTTO È PRONTO!

Il tuo sistema di mining è completamente configurato e pronto per partire!

---

## 🎯 AVVIA TUTTI I SERVIZI (1 COMANDO)

```bash
./start-all.sh
```

Questo avvierà:
- 🤖 Telegram Bot
- 💳 Payment Monitor
- 💰 Fee Payout Worker

---

## 📊 VERIFICA LO STATO

```bash
./status.sh
```

Mostra quali servizi sono attivi e gli ultimi log.

---

## 🛑 FERMA TUTTI I SERVIZI

```bash
./stop-all.sh
```

---

## 📋 VISUALIZZA I LOG

```bash
# Bot logs (live)
tail -f logs/bot.log

# Payment Monitor logs
tail -f logs/payment-monitor.log

# Fee Payout Worker logs
tail -f logs/fee-payout.log
```

---

## 👑 ADMIN DASHBOARD

Gestisci la piattaforma direttamente dal bot Telegram!

### Accesso Admin:
```
/admin YOUR_ADMIN_KEY
```

**La tua Admin Key:** `0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e`

### Comandi Admin:

```bash
# Menu principale
/admin 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Statistiche piattaforma
/admin_stats 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Utenti recenti
/admin_users 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Fee raccolte
/admin_fees 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Pagamenti lifetime access
/admin_payments 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Health check sistema
/admin_health 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e

# Trigger manuale payout fee
/admin_payout 0a38cc0c1b8c9f29bf2e95225a2500b184b675c61d32c0117afd74b9e5267b9e
```

### Funzionalità Admin:
- 📊 Visualizza statistiche complete piattaforma
- 👥 Gestisci utenti e lifetime access
- 💰 Monitora fee raccolte per ogni token
- 💳 Controlla pagamenti e revenue
- 🏥 Health check di database e servizi
- 💸 Trigger manuale payout automatico

---

## ✅ CONFIGURAZIONE BOT IN @BotFather

Esegui:
```bash
node scripts/configure-bot.js
```

Segui le istruzioni per configurare il bot in Telegram.

---

## 🧪 TESTA IL BOT

1. Apri Telegram
2. Cerca il tuo bot
3. Invia `/start`
4. Clicca "⛏️ Start Mining"
5. Prova a tappare!

---

## 💰 I TUOI WALLET

**TON (per pagamenti e conversioni):**
```
UQArbhbVEIkN4xSWis30yIrNGdmOTBbiMBduGeNTErPbviyR
```

**6 Scrypt Coins (per fee mining):**
- BELLS: B5K4zaWC2rUFJfbGbxwHqF9TLRCysiuYDV
- LKY: LSW7zztEWjjCRoWuTwcX28joihrxarZE2u
- PEP: PaS36tR8PgkKtahY1BFXLjUwYYRPpHh6u3
- JKC: JcnYtBb8Erk9Z3ttxLq2G3yrnBxqvBG9vb
- DINGO: DGrJyvBfcdmeZ1sVyN1hbftCBfBAJs1MfB
- SHIC: SjKVZNGwmYqQTqHV1pDgonjinPayCaR5gB

**Backup:** `/storage/downloads/scrypt-wallets-BACKUP.json`

---

## 🔐 CREDENZIALI

- **Bot Token:** Configurato in `.env`
- **Database:** Supabase (configurato e migrato)
- **TON API:** Configurata
- **Admin Key:** Generata e configurata

---

## 🆘 TROUBLESHOOTING

### Bot non si avvia?
```bash
node bot/main.js
# Guarda gli errori
```

### Database non connette?
```bash
node scripts/health-check.js
```

### Workers non funzionano?
```bash
# Controlla i log
tail -f logs/payment-monitor.log
tail -f logs/fee-payout.log
```

---

## 📚 DOCUMENTAZIONE COMPLETA

- `DEPLOYMENT_GUIDE.md` - Guida deploy completa
- `TELEGRAM_APP_VERIFICATION.md` - Come sottomettere a Telegram
- `MARKETING_DESCRIPTION.md` - Descrizioni marketing
- `QUICK_START.md` - Quick reference

---

## 🎉 SEI PRONTO!

1. **Avvia**: `./start-all.sh`
2. **Verifica**: `./status.sh`
3. **Testa**: Apri bot in Telegram
4. **Configura**: `node scripts/configure-bot.js`
5. **Profitto!** 💰

---

**BUON MINING! ⛏️💎**
