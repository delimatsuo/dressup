# DressUp AI - Cloud Deployment Guide

## 🚀 Quick Deploy to Vercel (Recommended)

Vercel is the easiest platform for Next.js apps and offers free hosting for testing.

### Prerequisites
- GitHub repository (✅ Already set up: `delimatsuo/dressup`)
- Firebase backend (✅ Already deployed)
- Vercel account (free)

## Step 1: Prepare for Deployment

### 1.1 Update Firebase Security Rules
Ensure your Firebase Storage rules allow public read for generated images:

```javascript
// storage.rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow read access to all files
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 1.2 Update CORS Configuration
Your Firebase functions already have CORS enabled (✅ Verified in code).

## Step 2: Deploy to Vercel

### Option A: One-Click Deploy (Easiest)

1. Visit [Vercel](https://vercel.com)
2. Sign up/Login with GitHub
3. Click "Add New Project"
4. Import `delimatsuo/dressup` repository
5. Configure environment variables (see below)
6. Click "Deploy"

### Option B: CLI Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Set up and deploy: Y
# - Which scope: Your account
# - Link to existing project: N
# - Project name: dressup-ai
# - Directory: ./
# - Override settings: N
```

## Step 3: Configure Environment Variables in Vercel

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCymky2qcq-8x2VMKS4aFpIwXZXRGHq-t0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=projectdressup.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=projectdressup
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=projectdressup.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=208976913089
NEXT_PUBLIC_FIREBASE_APP_ID=1:208976913089:web:487ff6bdd07478a0866a40
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-27409KDVNL
NEXT_PUBLIC_GCP_PROJECT_ID=projectdressup
NEXT_PUBLIC_GCP_PROJECT_NUMBER=208976913089
```

## Step 4: Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com/project/projectdressup/authentication/settings)
2. Add your Vercel domains:
   - `dressup-ai.vercel.app`
   - `*.vercel.app`
   - Your custom domain (if any)

## Step 5: Test Your Deployment

Your app will be available at:
- **Production**: `https://dressup-ai.vercel.app`
- **Preview**: Each PR gets a unique URL

## 📊 Cost Breakdown

### Free Tier Limits:
- **Vercel**: 
  - 100GB bandwidth/month
  - Unlimited static requests
  - 100 hours build time/month
  
- **Firebase**:
  - Firestore: 50K reads, 20K writes/day
  - Storage: 5GB storage, 1GB/day download
  - Functions: 125K invocations/month
  - Google AI API: Pay-per-use

### Estimated Costs for Testing (100 users):
- Vercel: **$0** (within free tier)
- Firebase: **$0** (within free tier for testing)
- Google AI API: ~**$3-5** (depending on usage)

## 🔒 Security Checklist

- [x] Firebase API keys are public (this is normal)
- [ ] Add domain restrictions in Google Cloud Console
- [ ] Set up rate limiting for production
- [ ] Add authentication for production use
- [ ] Monitor usage in Firebase Console

## 🧪 Testing with Users

### Share Your App:
1. Main URL: `https://dressup-ai.vercel.app`
2. Create a simple feedback form (Google Forms)
3. Monitor errors in Vercel Dashboard → Functions tab
4. Check Firebase Console for usage metrics

### Quick Test Checklist:
- [ ] Upload user photo works
- [ ] Upload garment photo works
- [ ] Generation completes successfully
- [ ] Images display correctly
- [ ] Download functionality works
- [ ] Regenerate with instructions works
- [ ] Mobile responsive design works

## 🚨 Monitoring & Debugging

### Vercel Dashboard:
- Real-time logs: Functions tab
- Analytics: Analytics tab
- Errors: Monitor runtime logs

### Firebase Console:
- Function logs: Functions → Logs
- Storage usage: Storage tab
- Firestore data: Firestore tab

## 📱 Alternative Deployment Options

### Option 2: Netlify
- Similar to Vercel, great for static sites
- Free tier: 100GB bandwidth/month
- Deploy via GitHub integration

### Option 3: Firebase Hosting
- Already using Firebase backend
- More complex setup for Next.js
- Better if you want everything in one place

### Option 4: Railway/Render
- Good for full-stack apps
- $5/month starting
- Better for production

## 🎯 Next Steps for Production

1. **Add Authentication**: Implement user accounts
2. **Rate Limiting**: Prevent abuse
3. **Payment Integration**: Stripe/PayPal for credits
4. **Analytics**: Track user behavior
5. **Error Tracking**: Sentry integration
6. **CDN**: Cloudflare for images
7. **Database Optimization**: Indexes and caching

## 📞 Support Resources

- [Vercel Docs](https://vercel.com/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Ready to deploy?** Start with Step 2 - it takes less than 5 minutes!