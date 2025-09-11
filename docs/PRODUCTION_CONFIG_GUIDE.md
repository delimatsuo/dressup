# DressUp AI - Production Configuration Guide

## 🎯 Quick Start Production Deployment

This guide will get DressUp AI running in production on Vercel with full functionality.

## 📋 Prerequisites

- [Vercel Account](https://vercel.com) (free tier sufficient)
- [Google AI API Key](https://ai.google.dev/) for Gemini 2.5 Flash
- Domain name (optional, Vercel provides .vercel.app subdomain)

## 🚀 Step-by-Step Deployment

### 1. **Prepare Services**

#### A. Google AI (Gemini 2.5 Flash)
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create API key for Gemini 2.5 Flash
3. Note down your `GOOGLE_AI_API_KEY`

#### B. Vercel Account Setup
1. Fork/clone this repository to your GitHub
2. Connect GitHub repository to Vercel
3. Vercel will automatically configure Blob Storage and KV

### 2. **Environment Variables**

Configure these in Vercel Dashboard → Project → Settings → Environment Variables:

```bash
# === REQUIRED ===
GOOGLE_AI_API_KEY=your_gemini_api_key_here
BLOB_READ_WRITE_TOKEN=auto_generated_by_vercel
KV_REST_API_URL=auto_generated_by_vercel
KV_REST_API_TOKEN=auto_generated_by_vercel
KV_REST_API_READ_ONLY_TOKEN=auto_generated_by_vercel

# === SECURITY ===
CRON_SECRET=generate_secure_random_string_here
ADMIN_API_KEY=generate_admin_key_for_manual_cleanup

# === APP SETTINGS ===
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. **Vercel Services Setup**

#### A. Enable Vercel Blob Storage
```bash
# In your Vercel dashboard
1. Go to Storage tab
2. Create new Blob store
3. Name it "dressup-images" 
4. Copy the connection tokens to environment variables
```

#### B. Enable Vercel KV (Redis)
```bash
# In your Vercel dashboard  
1. Go to Storage tab
2. Create new KV store
3. Name it "dressup-sessions"
4. Copy the connection strings to environment variables
```

### 4. **Deploy**

#### Option A: Automatic (Recommended)
1. Push code to GitHub
2. Vercel auto-deploys on push to main branch
3. Monitor deployment in Vercel dashboard

#### Option B: Manual using CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
./scripts/deploy-production.sh
```

## ⚙️ Configuration Details

### Security Headers (Already Configured)

The app includes production-ready security headers:

- **Content Security Policy**: Restricts resource loading
- **HSTS**: Forces HTTPS connections  
- **X-Frame-Options**: Prevents clickjacking
- **X-Content-Type-Options**: Prevents MIME sniffing
- **Permissions Policy**: Restricts browser APIs

### Automatic Cleanup

- **Cron Job**: Runs every 15 minutes (`/api/cron/cleanup`)
- **Session TTL**: 30 minutes with activity-based extension
- **Image Cleanup**: Automatic blob cleanup after session expiry

### Rate Limiting

Built-in rate limiting protects against abuse:
- **Upload**: 10 requests per minute per IP
- **API**: 60 requests per minute per IP  
- **Try-on**: Limited by session and upload quotas

## 🔍 Monitoring & Health Checks

### Built-in Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/cron/cleanup` - Manual cleanup trigger (requires auth)
- Monitor logs in Vercel dashboard

### Key Metrics to Monitor

1. **Session Creation Rate**: Normal usage patterns
2. **Cleanup Success**: Cron job completing successfully  
3. **Error Rates**: API failures and user-facing errors
4. **Response Times**: Try-on generation performance (target <30s)

## 🧪 Production Testing Checklist

After deployment, test these critical paths:

### ✅ Core Functionality
- [ ] Homepage loads with simplified UI
- [ ] Image upload works (drag & drop + click)
- [ ] File validation (size, format) functions
- [ ] AI try-on generation completes successfully
- [ ] Results display with download option
- [ ] "Try Another" workflow functions

### ✅ Session Management  
- [ ] Sessions auto-create on first visit
- [ ] Session timer displays in header
- [ ] Session extends on activity
- [ ] Session expires after 30 minutes of inactivity

### ✅ Mobile Experience
- [ ] Mobile-optimized interface loads
- [ ] Camera integration works on mobile
- [ ] Touch interactions function properly
- [ ] Responsive design displays correctly

### ✅ Error Handling
- [ ] Invalid file formats show clear errors
- [ ] Network errors display user-friendly messages  
- [ ] API failures provide recovery options
- [ ] Rate limiting shows appropriate messages

## 🚨 Troubleshooting

### Common Issues

**1. "AI Generation Failed"**
- Verify `GOOGLE_AI_API_KEY` is correct
- Check API quotas in Google AI Studio
- Monitor API response in Vercel logs

**2. "Upload Failed"** 
- Verify Vercel Blob configuration
- Check `BLOB_READ_WRITE_TOKEN` environment variable
- Ensure file size is under 5MB

**3. "Session Expired"**
- Verify Vercel KV configuration  
- Check KV connection strings
- Monitor session creation in logs

**4. "Build Errors"**
- Ensure Node.js version compatibility (18+)
- Check for TypeScript errors
- Verify all dependencies are installed

### Debug Commands

```bash
# Check deployment logs
vercel logs

# Test endpoints locally
curl https://your-app.vercel.app/api/health

# Manual cleanup trigger (requires auth)
curl -X POST https://your-app.vercel.app/api/cron/cleanup \
  -H "Authorization: Bearer your-admin-api-key"
```

## 📈 Performance Optimization

### Already Configured

- **Next.js 15**: Latest performance optimizations
- **Edge Runtime**: Global distribution for API routes
- **Image Optimization**: Vercel's built-in image optimization
- **Bundle Optimization**: Tree shaking and code splitting

### Additional Optimizations (Optional)

1. **Custom Domain**: Configure custom domain in Vercel
2. **Analytics**: Enable Vercel Analytics for usage insights  
3. **Caching**: CDN caching already optimized
4. **Monitoring**: Consider adding Sentry for error tracking

## 🔒 Security Best Practices (Implemented)

- ✅ **No Data Retention**: Images auto-deleted after 30 minutes
- ✅ **HTTPS Only**: Enforced via security headers
- ✅ **Rate Limiting**: Prevents abuse and DoS attacks
- ✅ **Input Validation**: File type, size, and content validation  
- ✅ **Secure Sessions**: Temporary session-based architecture
- ✅ **CSP Headers**: Prevent XSS and injection attacks

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: See README.md and HANDOVER_DOCUMENT.md  
- **Performance**: Monitor via Vercel dashboard
- **Logs**: Access via `vercel logs` command

---

**🎉 Your DressUp AI app is now production-ready!**

The simplified UI provides an excellent user experience while maintaining enterprise-grade security and performance.