# Production Testing Guide for DressUp AI

## 🚀 Deployment Options

### Option 1: Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel

# Or link to existing project
vercel link
vercel --prod
```

### Option 2: Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Deploy
npm run build
firebase deploy --only hosting
```

### Option 3: Local Production Testing
```bash
# Build the production version
npm run build

# Start production server locally
npm run start

# Open http://localhost:3000
```

## 🧪 Testing Checklist

### 1. Core Functionality Tests
- [ ] **Photo Upload**: Test single photo upload
- [ ] **Multi-Photo**: Test 3-photo outfit creation
- [ ] **Garment Selection**: Verify all garment types work
- [ ] **Processing**: Confirm image processing works
- [ ] **Results Display**: Check result rendering

### 2. Session Management
- [ ] **Session Creation**: New sessions initialize correctly
- [ ] **Session Persistence**: Sessions persist across refreshes
- [ ] **Session Expiry**: 2-hour expiry works
- [ ] **Photo Storage**: Photos saved to session

### 3. Firebase Integration
- [ ] **Authentication**: Anonymous auth works
- [ ] **Storage**: Images upload to Firebase Storage
- [ ] **Functions**: Cloud Functions respond correctly
- [ ] **Firestore**: Data persists to database

### 4. Performance Tests
- [ ] **Page Load**: < 3 seconds on 3G
- [ ] **Image Upload**: < 5 seconds processing
- [ ] **Bundle Size**: Check network tab for sizes
- [ ] **Caching**: Service worker caches assets

### 5. Accessibility Tests
- [ ] **Keyboard Navigation**: Tab through all elements
- [ ] **Screen Reader**: Test with VoiceOver/NVDA
- [ ] **Color Contrast**: Check with DevTools
- [ ] **Focus Indicators**: Visible focus states

### 6. Responsive Design
- [ ] **Mobile (375px)**: Test on iPhone SE size
- [ ] **Tablet (768px)**: Test on iPad size
- [ ] **Desktop (1440px)**: Test on desktop
- [ ] **Touch Interactions**: Test on actual device

### 7. Error Handling
- [ ] **Network Offline**: Test offline mode
- [ ] **Invalid Files**: Upload non-image files
- [ ] **Large Files**: Test > 10MB files
- [ ] **API Failures**: Test with network throttling

## 📊 Production URLs

### After Deployment:
- **Production**: `https://your-app.vercel.app`
- **Preview**: `https://your-app-git-branch.vercel.app`
- **Firebase**: `https://dressup-ai.web.app`

## 🔍 Monitoring Tools

### 1. Performance Monitoring
```bash
# Run Lighthouse CI
npm run lighthouse

# Check bundle analyzer
npm run analyze
```

### 2. Error Tracking (Sentry)
- Check Sentry dashboard for errors
- Monitor error rates
- Review user sessions

### 3. Analytics (Google Analytics)
- Page views
- User flows
- Conversion rates
- Performance metrics

## 🛠️ Quick Test Commands

```bash
# Run all production tests
npm run test:production

# Run E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Validate production build
npm run validate:production
```

## 📱 Mobile Testing

### iOS Safari
1. Open Safari on iPhone/iPad
2. Navigate to production URL
3. Test photo capture
4. Check responsive design

### Android Chrome
1. Open Chrome on Android
2. Navigate to production URL
3. Test photo upload
4. Verify touch interactions

## 🔐 Security Checklist

- [ ] HTTPS enabled
- [ ] CSP headers configured
- [ ] API keys secured
- [ ] Rate limiting active
- [ ] Input validation working

## 📈 Performance Benchmarks

### Target Metrics:
- **FCP**: < 1.8s
- **LCP**: < 2.5s
- **TTI**: < 3.8s
- **CLS**: < 0.1
- **FID**: < 100ms

## 🚨 Common Issues & Solutions

### Build Fails
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Firebase Functions Not Working
```bash
# Redeploy functions
cd functions
npm install
firebase deploy --only functions
```

### Images Not Loading
- Check Firebase Storage rules
- Verify CORS configuration
- Check image URLs in Network tab

## 📞 Support Contacts

- **Technical Issues**: Create GitHub issue
- **Firebase Support**: firebase-support@google.com
- **Vercel Support**: support@vercel.com

## ✅ Go-Live Checklist

Before marking as production-ready:

1. [ ] All tests passing (>80% coverage)
2. [ ] Performance metrics met
3. [ ] Accessibility audit passed
4. [ ] Security review completed
5. [ ] Documentation updated
6. [ ] Backup/rollback plan ready
7. [ ] Monitoring configured
8. [ ] DNS configured
9. [ ] SSL certificate active
10. [ ] Analytics tracking enabled