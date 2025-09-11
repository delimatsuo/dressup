# Vercel Deployment Guide - DressUp AI

## 🚀 Quick Deployment

### Prerequisites
- Vercel account created
- Vercel CLI installed: `npm i -g vercel`
- Environment variables ready (see below)

### One-Click Deployment
```bash
# Run the automated deployment script
./scripts/deploy-production.sh
```

## 📋 Environment Variables Setup

### Required Variables in Vercel Dashboard

Navigate to your Vercel project → Settings → Environment Variables:

#### 🔑 Core Services
```bash
# Google AI (Gemini 2.5 Flash)
GOOGLE_AI_API_KEY=your_gemini_api_key_here

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here

# Vercel KV (Redis)
KV_REST_API_URL=your_kv_rest_api_url_here
KV_REST_API_TOKEN=your_kv_rest_api_token_here
KV_REST_API_READ_ONLY_TOKEN=your_kv_readonly_token_here
```

#### 🛡️ Security & Monitoring
```bash
# Cron job authentication (generate a secure random string)
CRON_SECRET=your_secure_cron_secret_here

# Admin API access (optional, for monitoring)
ADMIN_API_KEY=your_admin_api_key_here
```

### Environment Variable Targets
- **Production**: All variables required
- **Preview**: Core services only (GOOGLE_AI_API_KEY, BLOB_READ_WRITE_TOKEN, KV_*)
- **Development**: Use `.env.local` file

## 🔧 Manual Deployment Steps

### 1. Link Project to Vercel
```bash
# In project directory
vercel login
vercel link
```

### 2. Configure Environment Variables
```bash
# Set each environment variable
vercel env add GOOGLE_AI_API_KEY production
vercel env add BLOB_READ_WRITE_TOKEN production
# ... continue for all variables
```

### 3. Deploy
```bash
# Deploy to production
vercel --prod
```

### 4. Verify Deployment
```bash
# Use our verification script
./scripts/verify-deployment.sh https://your-app.vercel.app
```

## ⚙️ Vercel Configuration Details

### vercel.json Configuration
Our `vercel.json` includes:

- **Runtime Configuration**: Edge functions for speed, Node.js for cleanup
- **Security Headers**: CSP, HSTS, X-Frame-Options
- **Cron Jobs**: Automatic cleanup every 15 minutes
- **Function Timeouts**: 60 seconds for AI processing
- **Regional Deployment**: Multi-region for global performance

### Key Configuration Points

#### Function Runtimes
```json
{
  "functions": {
    "src/app/api/**/*.ts": {
      "runtime": "edge",
      "maxDuration": 30
    },
    "src/app/api/cron/cleanup/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 60
    },
    "src/app/api/try-on/route.ts": {
      "maxDuration": 60
    },
    "src/app/api/upload/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### Security Headers
- **CSP**: Allows Gemini AI, Vercel Blob, fonts
- **HSTS**: Enforces HTTPS with preload
- **X-Frame-Options**: Prevents clickjacking
- **Permissions Policy**: Restricts dangerous APIs

#### Cron Jobs
```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## 🔍 Post-Deployment Verification

### Automated Testing
```bash
# Run comprehensive verification
./scripts/verify-deployment.sh https://your-app.vercel.app

# Monitor deployment health
./scripts/monitor-production.sh --url https://your-app.vercel.app
```

### Manual Testing Checklist

#### Core Functionality
- [ ] Main page loads without errors
- [ ] User photo upload works (drag & drop + file picker)
- [ ] Garment image upload works
- [ ] AI try-on generation completes (15-30 seconds)
- [ ] Results display correctly with download option
- [ ] Session persistence across page refreshes

#### Mobile Testing
- [ ] Mobile interface loads properly
- [ ] Camera integration works on mobile devices
- [ ] Touch interactions work smoothly
- [ ] Layout adapts to different screen sizes

#### Security & Performance
- [ ] Security headers present in response
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] Page loads in under 3 seconds
- [ ] No console errors in browser
- [ ] Cron endpoint returns 401/403 without auth

#### Session Management
- [ ] Sessions auto-expire after 30 minutes
- [ ] Session timer displays correctly
- [ ] Automatic cleanup removes expired data
- [ ] Session restoration works after browser refresh

## 🚨 Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Clear Next.js cache
rm -rf .next
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

#### Environment Variable Issues
```bash
# List configured variables
vercel env ls

# Pull production variables to local
vercel env pull .env.production
```

#### Function Timeout Issues
```bash
# Check function logs
vercel logs --follow

# Monitor specific function
vercel logs --grep="/api/try-on"
```

#### Cron Job Not Working
1. Verify `CRON_SECRET` is configured
2. Check cron job logs: `vercel logs --grep="/api/cron"`
3. Ensure cleanup endpoint returns 200 OK

### Performance Issues

#### Slow AI Processing
- Gemini API may have rate limits or regional delays
- Check API key quota and billing
- Monitor response times in logs

#### Large Bundle Size
```bash
# Analyze bundle
ANALYZE=true npm run build

# Check for unnecessary dependencies
npm ls --depth=0
```

## 📊 Monitoring & Analytics

### Built-in Health Checks
- `/api/health` - Basic health status
- `/api/health?detailed=true` - Comprehensive system status

### Production Monitoring
```bash
# Continuous monitoring
./scripts/monitor-production.sh --continuous --url https://your-app.vercel.app

# Alert on failures
./scripts/monitor-production.sh --alert-webhook https://your-webhook-url
```

### Key Metrics to Monitor
- **Response Times**: API endpoints < 2s, AI processing < 30s
- **Error Rates**: < 5% overall error rate
- **Session Management**: Proper cleanup and TTL handling
- **Storage Usage**: Blob storage cleanup working
- **Security**: No unauthorized access attempts

## 🔄 Rollback Procedures

### Quick Rollback
```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific commit
git checkout <previous-commit>
vercel --prod
```

### Emergency Procedures
1. **Service Outage**: Use Vercel dashboard to rollback instantly
2. **Security Issue**: Rotate environment variables immediately
3. **Data Issue**: Check KV storage and Blob storage for cleanup needs

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Functions](https://vercel.com/docs/functions)

## 🆘 Support

For deployment issues:
1. Check Vercel dashboard for deployment logs
2. Review function logs with `vercel logs`
3. Run verification script for systematic testing
4. Check environment variables are properly configured

---

**Last Updated**: September 2025  
**Version**: 1.0  
**Status**: Production Ready ✅