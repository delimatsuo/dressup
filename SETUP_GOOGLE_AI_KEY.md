# IMPORTANT: Google AI API Key Setup Required

The application is configured but **WILL NOT WORK** until you set up a real Google AI API key.

## Steps to Fix:

1. **Get your Google AI API Key:**
   - Go to https://makersuite.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the API key

2. **Update the Cloud Function secret:**
   ```bash
   echo "YOUR_ACTUAL_API_KEY_HERE" | firebase functions:secrets:set GOOGLE_AI_API_KEY
   ```

3. **Redeploy the function:**
   ```bash
   npm run deploy
   ```

## Current Status:
- ✅ Code is configured to use Google AI SDK with `gemini-2.5-flash-image-preview`
- ✅ Cloud Function is configured to use the secret
- ❌ API key is currently a placeholder and needs to be replaced with your real key

## Why it's failing:
The error "403 Forbidden - Method doesn't allow unregistered callers" means the API key is invalid or missing.

Once you update the API key with a real one from Google AI Studio, the virtual try-on will work properly.