# Deployment Guide - FasTapMining (Post Security Audit)

## Prerequisites

Before deploying, ensure you have:
- [ ] GitHub repository access
- [ ] Vercel account connected to GitHub
- [ ] Telegram Bot Token from @BotFather
- [ ] TON wallet address (for payments)
- [ ] TonCenter API key (optional but recommended)
- [ ] PostgreSQL database (production)
- [ ] Redis instance (production)

---

## 1. Environment Variables Setup

### Required Variables

Add these to your Vercel project settings:

```bash
# Database (Production)
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://user:password@host:6379

# Telegram Bot
TOKEN_API_BOT=your_telegram_bot_token_here
WEBAPP_URL=https://your-app.vercel.app

# TON Blockchain - CRITICAL: Keep secret!
OWNER_WALLET=UQ...your_ton_wallet_address
PAYMENT_WALLET=UQ...your_ton_wallet_address  # Can be same as OWNER_WALLET
TONCENTER_API_KEY=your_toncenter_api_key_here
LIFETIME_ACCESS_PRICE=1

# System
NODE_ENV=production
```

### Optional Variables

```bash
# Mining Configuration (if using real mining)
XMR_WALLET=your_monero_wallet_address
CHANGENOW_API_KEY=your_changenow_api_key

# Database SSL (for some providers)
DB_SSL=true
```

---

## 2. Database Setup

### PostgreSQL Schema

Run the schema migration before first deployment:

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL < database/schema.sql

# Or if using Node.js script
node database/migrate.js
```

### Redis Configuration

Ensure Redis is accessible from your deployment:
- Configure firewall rules
- Set up authentication if needed
- Test connection before deployment

---

## 3. Vercel Deployment

### First Time Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Set environment variables
vercel env add DATABASE_URL production
vercel env add TOKEN_API_BOT production
# ... add all other variables

# Deploy to production
vercel --prod
```

### Subsequent Deployments

```bash
# Pull latest changes
git pull origin main

# Deploy
vercel --prod
```

---

## 4. Security Checklist

Before going live, verify:

- [ ] All environment variables are set in Vercel
- [ ] `OWNER_WALLET` and `PAYMENT_WALLET` are correct
- [ ] `TOKEN_API_BOT` is valid and active
- [ ] Database connection works
- [ ] Redis connection works
- [ ] No secrets are committed to Git
- [ ] `.env` file is in `.gitignore`
- [ ] Rate limiting is configured
- [ ] Security headers are enabled
- [ ] Dependencies are up to date (no vulnerabilities)

---

## 5. Telegram Bot Setup

### Configure Bot with @BotFather

1. Open Telegram and find @BotFather
2. Send `/newapp` to create Mini App
3. Select your bot
4. Provide:
   - App title: `FasTapMining`
   - Description: `Real multi-token mining pool on TON`
   - Photo: Upload your app icon
   - Web App URL: `https://your-app.vercel.app`
   - Short name: `fastapmining` (or your preference)

### Set Bot Commands (Optional)

```bash
/start - Start mining
/stats - View statistics
/wallet - Connect wallet
/claim - Claim rewards
/help - Get help
```

---

## 6. Post-Deployment Verification

### Test Critical Flows

1. **TON Connect Initialization**
   ```
   - Open app in Telegram
   - Verify "Connect TON Wallet" button appears
   - Not stuck on "Initializing..."
   - Click connects wallet successfully
   ```

2. **Mining Flow**
   ```
   - Connect wallet
   - Select a pool
   - Tap to mine
   - Verify shares increase
   - Check stats update
   ```

3. **Transaction Verification**
   ```
   - Send test payment
   - Verify transaction is verified on-chain
   - Check access is granted
   - Verify database is updated
   ```

4. **Rate Limiting**
   ```bash
   # Test with curl or similar
   for i in {1..250}; do
     curl -X POST https://your-app.vercel.app/api/mining \
       -H "Content-Type: application/json" \
       -d '{"userId":123,"taps":1,"poolId":"minex"}'
   done
   # Should see 429 Too Many Requests after ~200
   ```

5. **Security Headers**
   ```bash
   curl -I https://your-app.vercel.app
   # Verify headers are present:
   # X-Content-Type-Options: nosniff
   # X-Frame-Options: DENY
   # X-XSS-Protection: 1; mode=block
   ```

---

## 7. Monitoring Setup

### Vercel Monitoring

Enable in Vercel dashboard:
- [ ] Error tracking
- [ ] Performance monitoring
- [ ] Analytics
- [ ] Logs

### Custom Monitoring

Add to your application:
```javascript
// Log all errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  // Send to monitoring service
});

// Track API metrics
const metrics = {
  requests: 0,
  errors: 0,
  avgResponseTime: 0
};
```

---

## 8. Backup Strategy

### Database Backups

Set up automated backups:
- Daily full backups
- Point-in-time recovery enabled
- Test restore procedure monthly

### Environment Variables Backup

Keep secure backup of all environment variables in password manager or secure vault.

---

## 9. Rollback Procedure

If issues arise after deployment:

```bash
# Option 1: Redeploy previous version
vercel rollback

# Option 2: Deploy specific commit
git checkout <previous-commit-hash>
vercel --prod
git checkout main

# Option 3: Use Vercel dashboard
# Go to Deployments -> Click on previous deployment -> Promote to Production
```

---

## 10. Security Incident Response

If security issue is detected:

1. **Immediate Actions**
   - Disable affected endpoint if possible
   - Review logs for exploitation attempts
   - Notify users if data breach occurred

2. **Investigation**
   - Identify vulnerability
   - Assess impact
   - Document incident

3. **Remediation**
   - Patch vulnerability
   - Deploy fix
   - Verify fix works
   - Update security audit

4. **Post-Incident**
   - Conduct post-mortem
   - Update security procedures
   - Improve monitoring

---

## 11. Performance Optimization

### Caching Strategy

- Enable Redis caching for:
  - User data
  - Pool statistics
  - Leaderboards
  - Block history

### CDN Configuration

Vercel handles CDN automatically, but optimize:
- Cache static assets (1 year)
- Cache API responses (per endpoint)
- Use Edge Functions for frequently accessed data

---

## 12. Compliance

### GDPR Compliance

- [ ] Privacy policy published (`/public/privacy.html`)
- [ ] Terms of service published (`/public/terms.html`)
- [ ] User data collection is minimal
- [ ] Users can delete their data
- [ ] Data retention policy defined

### Financial Regulations

- [ ] Disclaimer about cryptocurrency risks
- [ ] Not providing financial advice
- [ ] Comply with local regulations

---

## 13. Maintenance Schedule

### Weekly
- Review error logs
- Check rate limit effectiveness
- Monitor database performance
- Review new security advisories

### Monthly
- Update dependencies
- Review and rotate API keys
- Test backup restoration
- Security audit

### Quarterly
- Full security penetration test
- Update documentation
- Review and update incident response plan
- Performance optimization review

---

## Support Contacts

- **GitHub Issues**: https://github.com/Marcone1983/FasTapMining/issues
- **Security Issues**: Mark as "security" priority
- **Telegram Support**: (Configure support channel)

---

## Additional Resources

- [TON Documentation](https://ton.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Last Updated**: 2026-01-23  
**Version**: 3.0.0 (Post Security Audit)
