# DressUp AI - API Key Setup Guide

## Quick Setup Steps

### 1. Create New API Key
- Go to: https://console.cloud.google.com/apis/credentials?project=projectdressup
- Click "+ CREATE CREDENTIALS" → "API key"
- Copy the new key immediately

### 2. Configure the Key
- **Name**: DressUp-Server-Firebase-Functions
- **Application Restrictions**: None (required for server-side)
- **API Restrictions**: Restrict key → Select ONLY "Generative Language API"
- Click SAVE

### 3. Add to Firebase Secrets
```bash
cd /Users/delimatsuo/Documents/Coding/dressup/functions
firebase functions:secrets:set GOOGLE_AI_API_KEY_SERVER
# Paste your new key when prompted
```

### 4. Verify Secret
```bash
firebase functions:secrets:list
# Should show both GOOGLE_AI_API_KEY and GOOGLE_AI_API_KEY_SERVER
```

### 5. Deploy Functions
```bash
firebase deploy --only functions:generateTryOn,functions:generateMultipleTryOnPoses
```

### 6. Test
- Visit: https://dressup-nine.vercel.app
- Upload photos and generate outfit
- Should work without 403 errors!

## Security Features Implemented
- ✅ Two-key system (browser key + server key)
- ✅ Rate limiting (10 requests/minute)
- ✅ API restrictions (Generative Language API only)
- ✅ Secure storage in Firebase Secrets
- ✅ No hardcoded keys in code

## Troubleshooting
- **Still getting 403?** → Check that Application Restrictions is set to "None"
- **Key not working?** → Verify API Restrictions includes "Generative Language API"
- **Deployment fails?** → Run `firebase functions:secrets:list` to verify secret exists/var/folders/qp/p6wvgz4s0vq73cdkjdmrc98w0000gn/T/TemporaryItems/NSIRD_screencaptureui_onksix/Screenshot 2025-09-09 at 10.00.41 AM.png