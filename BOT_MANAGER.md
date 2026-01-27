# 🤖 FasTapMining Bot Manager

## ✅ Bot Configurato per Girare Sempre!

Il bot ora gira in background con **PM2 Process Manager** e **termux-wake-lock** attivo.

**🔒 IMPORTANTE:** Il bot continua a funzionare **anche quando chiudi Termux** grazie al wake lock Android che impedisce al sistema di killare i processi.

---

## 🚀 Comandi Principali

### Vedere lo stato del bot:
```bash
pm2 status
```

### Vedere i log in tempo reale:
```bash
pm2 logs fastap-bot
```
Premi `Ctrl+C` per uscire dai log.

### Vedere solo gli ultimi 30 log:
```bash
pm2 logs fastap-bot --lines 30 --nostream
```

### Riavviare il bot:
```bash
pm2 restart fastap-bot
```

### Fermare il bot:
```bash
pm2 stop fastap-bot
```

### Riavviare il bot (se fermo):
```bash
pm2 start fastap-bot
```

### Monitoring in tempo reale (CPU, RAM, etc):
```bash
pm2 monit
```
Premi `q` per uscire.

### Informazioni dettagliate:
```bash
pm2 show fastap-bot
```

---

## 🔄 Auto-Avvio

Quando apri Termux, il bot si riavvia automaticamente grazie al comando nel `.bashrc`.

Se vuoi avviarlo manualmente:
```bash
cd ~/FasTapMining
./start-bot.sh
```

## 🔒 Wake Lock (IMPORTANTE!)

Il bot usa **termux-wake-lock** per impedire ad Android di killare i processi quando chiudi Termux.

**Cosa significa?**
- ✅ Il bot continua a girare anche con Termux chiuso
- ✅ Il telefono può andare in standby, il bot continua
- ✅ Puoi usare altre app, il bot continua
- ⚠️ Consuma più batteria (necessario per far girare il bot 24/7)

**Per verificare che il wake lock sia attivo:**
```bash
termux-wake-lock
```
Nessun output = wake lock già attivo (normale)

**Per disattivare il wake lock (ferma il bot quando chiudi Termux):**
```bash
termux-wake-unlock
```

---

## 📊 Verificare Connessione Pool

Il bot è connesso a **ViaBTC Pool** (ltc.viabtc.io:3333) con worker `FasTapMining.001`.

Controlla che nei log vedi:
- ✅ Connected to ltc.viabtc.io:3333!
- ✅ Worker authorized: FasTapMining.001
- ⛏️ READY TO MINE 8 COINS

---

## 🔥 Status Attuale

```
┌────┬───────────────┬─────────┬──────────┬────────┬───────────┐
│ ID │ Name          │ Mode    │ Status   │ CPU    │ Memory    │
├────┼───────────────┼─────────┼──────────┼────────┼───────────┤
│ 0  │ fastap-bot    │ fork    │ online   │ 0%     │ 117mb     │
└────┴───────────────┴─────────┴──────────┴────────┴───────────┘
```

**✅ Bot Online e Mining attivo!**

---

## 💡 Tips

1. **Chiudi Termux senza problemi** - Il bot continua a girare in background
2. **Verifica ogni tanto** - Apri Termux e digita `pm2 status`
3. **Se il bot crasha** - PM2 lo riavvia automaticamente
4. **Log persistenti** - Tutti i log sono salvati in `~/.pm2/logs/`

---

## 📱 Web App

Il bot serve la web app su: **https://fas-tap-mining.vercel.app**

Con il paywall attivo per 1 TON lifetime mining!

---

## 🆘 Problemi?

Se il bot non risponde:
```bash
pm2 restart fastap-bot
```

Se non parte:
```bash
cd ~/FasTapMining
pm2 delete fastap-bot
pm2 start bot/main.js --name "fastap-bot" --log logs/pm2-bot.log --time
pm2 save
```

Per vedere errori:
```bash
pm2 logs fastap-bot --err --lines 50
```

---

**🎉 Il bot è configurato e pronto! Puoi chiudere Termux quando vuoi.**
