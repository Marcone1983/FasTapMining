# ✅ COMPLIANCE & DEPLOYMENT CHECKLIST

**Use this checklist before deploying to production to ensure legal, ethical, and sustainable operation.**

---

## 📋 LEGAL & ToS COMPLIANCE

### Cloud Provider Terms of Service:
- [ ] **NO multi-account on Oracle Cloud** - Only 1 account per person allowed
- [ ] **NO mining on Google Cloud Free Trial** - Explicitly prohibited in ToS
- [ ] **NO mining on AWS Free Tier** - Against acceptable use policy
- [ ] **NO mining on Azure Free Trial** - Violates terms of service
- [ ] **✅ USE providers that ALLOW mining**: Hetzner, Contabo, OVH (verify current ToS)

### User Consent & Disclosure:
- [ ] **Client mining is OPT-IN** - No automatic/background mining without consent
- [ ] **Transparent disclosure** - Clear explanation of what client mining does
- [ ] **Easy opt-out** - One-click stop button always visible
- [ ] **Resource usage shown** - Display CPU%, hashrate, shares in real-time
- [ ] **Earnings transparency** - Show how rewards are calculated and distributed

---

## 🔒 SECURITY & PRIVACY

### Data Protection:
- [ ] **No sensitive data in client mining** - Only userId, walletAddress sent to proxy
- [ ] **WebSocket over TLS** (wss://) for production
- [ ] **Rate limiting** on mining-proxy to prevent abuse
- [ ] **Input validation** on all share submissions
- [ ] **No logging of personal data** in mining proxy

### Code Security:
- [ ] **Web Worker runs sandboxed** - No access to DOM or localStorage
- [ ] **No eval() or dynamic code execution** in mining worker
- [ ] **Dependencies audited** - Run `npm audit` and fix vulnerabilities
- [ ] **CORS properly configured** - Only allow your domain
- [ ] **No hardcoded private keys** - Use environment variables

---

## ⚡ PERFORMANCE & UX

### Client Mining Performance:
- [ ] **CPU throttling implemented** - Max 10% CPU usage
- [ ] **Battery saver detection** - Auto-stop when battery < 20%
- [ ] **Temperature monitoring** - Stop if device > 45°C (if API available)
- [ ] **Background tab detection** - Reduce/stop mining if tab inactive > 5 min
- [ ] **Mobile optimization** - Lighter algorithm on mobile devices

### User Experience:
- [ ] **Loading states** - Show spinner while worker initializes
- [ ] **Error handling** - Graceful degradation if Worker not supported
- [ ] **Haptic feedback** - Vibrate on share found (Telegram WebApp)
- [ ] **Visual feedback** - Animate when mining is active
- [ ] **Stats persistence** - Save cumulative stats to localStorage

---

## 📊 REALISTIC CLAIMS & COMMUNICATION

### Documentation:
- [ ] **NO claim "100% free"** - VPS costs $5-20/month (be honest)
- [ ] **NO claim "19,500 H/s"** - Realistic: 2,000-4,000 H/s total
- [ ] **NO claim "passive income"** - Mining requires active management
- [ ] **✅ CLAIM "sustainable"** - Architecture designed for long-term operation
- [ ] **✅ CLAIM "transparent"** - All code open source, verifiable

### User-Facing Text:
- [ ] **Update README.md** - Remove unrealistic hashrate promises
- [ ] **Update frontend disclaimers** - Accurate CPU usage and hashrate
- [ ] **Update marketing materials** - No misleading claims
- [ ] **Add risks section** - Mention electricity cost, device wear, ToS risks

---

## 🚀 DEPLOYMENT REQUIREMENTS

### Infrastructure:
- [ ] **VPS deployed** - Hetzner/Contabo/OVH server running XMRig
- [ ] **Mining proxy running** - WebSocket server on same VPS (port 8080)
- [ ] **PM2 configured** - Auto-restart on crashes
- [ ] **Monitoring setup** - PM2 logs, hashrate alerts
- [ ] **Domain configured** (optional) - SSL certificate for wss://

### Environment Variables:
- [ ] `XMR_WALLET` - Your Monero wallet address
- [ ] `MINING_PROXY_URL` - Your VPS IP:port or domain
- [ ] `NODE_ENV=production` - Production mode
- [ ] `PORT=8080` - Mining proxy port

### Vercel Deployment:
- [ ] **Frontend deployed** - Vercel production build
- [ ] **API endpoints working** - /api/mining, /api/stats, /api/claim
- [ ] **Environment variables set** - In Vercel dashboard
- [ ] **Custom domain** (optional) - Configure DNS

### Testing:
- [ ] **End-to-end test** - Tap → shares → pool acceptance
- [ ] **Client mining test** - Start/stop toggle works
- [ ] **WebSocket connection** - Proxy forwards jobs correctly
- [ ] **Mobile test** - Works in Telegram WebView on iOS/Android
- [ ] **Load test** - Can handle 100+ concurrent users

---

## 📈 MONITORING & MAINTENANCE

### Metrics to Track:
- [ ] **Total network hashrate** - VPS + client + mobile
- [ ] **Active client miners** - How many users opted in
- [ ] **Share acceptance rate** - Should be > 95%
- [ ] **Proxy uptime** - Should be > 99.5%
- [ ] **VPS hashrate** - Should be stable (±10%)

### Alerts to Configure:
- [ ] **VPS hashrate < 500 H/s** - XMRig may have crashed
- [ ] **Proxy offline** - Client mining won't work
- [ ] **Share rejection > 10%** - Pool connection issue
- [ ] **Memory usage > 80%** - May need to restart

### Regular Maintenance:
- [ ] **Weekly: Check PM2 logs** - Look for errors/warnings
- [ ] **Weekly: Verify pool dashboard** - Shares being accepted
- [ ] **Monthly: Update XMRig** - New versions improve hashrate
- [ ] **Monthly: Review VPS bill** - Ensure no unexpected charges
- [ ] **Quarterly: Review ToS** - Check if provider changed mining policy

---

## ⚠️ RED FLAGS TO AVOID

**DO NOT:**
- ❌ Use cloud free tiers for mining (ToS violation)
- ❌ Create multiple accounts on same provider (fraud)
- ❌ Mine in background without user knowledge (cryptojacking)
- ❌ Promise unrealistic returns ("make $1000/month!")
- ❌ Hide electricity/server costs from users
- ❌ Auto-enable client mining without consent
- ❌ Use Service Workers for persistent mining (malware-like)
- ❌ Ignore battery/temperature limits (damages devices)

**DO:**
- ✅ Use paid VPS from mining-friendly providers
- ✅ Transparent opt-in client mining
- ✅ Show real-time resource usage
- ✅ Document all costs honestly
- ✅ Respect device limitations
- ✅ Provide easy opt-out
- ✅ Monitor for abuse/overheating
- ✅ Keep documentation updated

---

## 📝 FINAL PRE-DEPLOYMENT CHECK

Before going live:

1. **Review all code** - Ensure no hardcoded secrets
2. **Test on multiple devices** - Desktop, Android, iOS
3. **Verify pool dashboard** - Shares appearing correctly
4. **Check VPS performance** - Stable hashrate for 24h
5. **Test fail scenarios** - What if proxy goes down?
6. **Legal review** (if needed) - Consult lawyer if unsure about regulations
7. **Privacy policy** - Add mining disclosure to privacy policy
8. **User agreement** - Update ToS to mention opt-in mining

---

## ✅ SIGN-OFF

- [ ] I have reviewed all checklist items
- [ ] I understand this is NOT a "get rich quick" scheme
- [ ] I commit to transparent and ethical operation
- [ ] I will monitor for compliance violations
- [ ] I will update documentation as architecture evolves

**Signed:** ___________________
**Date:** ___________________
**Role:** ___________________

---

**Remember:** Building sustainable crypto infrastructure requires honesty, transparency, and respect for users and platform ToS. This checklist helps ensure your FasTapMining deployment is production-ready and defensible.

🚀 **Deploy with confidence, maintain with diligence.**
