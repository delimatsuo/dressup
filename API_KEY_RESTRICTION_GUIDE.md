# 🔐 API Key Restriction - Step-by-Step Guide

## Why This is Important
Your Firebase API key (`AIzaSyCymky2qcq-8x2VMKS4aFpIwXZXRGHq-t0`) is currently unrestricted, meaning anyone could use it from any website. This could lead to:
- Unauthorized usage charges
- Potential abuse of your Firebase project
- Security vulnerabilities

## Step-by-Step Instructions

### 1. Open Google Cloud Console
1. Click this direct link: [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials?project=projectdressup)
2. Make sure you're logged in with the same Google account that owns the Firebase project
3. Verify you're in the correct project: **projectdressup** (should show at the top)

### 2. Find Your API Key
You'll see a list of credentials. Look for:
- **Type**: API key
- **Name**: Something like "Browser key" or "Auto-created API key"
- **Key**: Starts with `AIzaSyCymky2qcq-8x2VMKS4aFpIwXZXRGHq-t0`

Click on the **pencil icon (✏️)** or the key name to edit it.

### 3. Set Application Restrictions
In the API key details page:

1. **Find the section "Application restrictions"**
2. **Select "HTTP referrers (web sites)"**
3. **Click "ADD AN ITEM"** and add these URLs one by one:

```
https://*.vercel.app/*
https://localhost:3000/*
https://localhost:3001/*
http://localhost:3000/*
http://localhost:3001/*
```

**Note**: Add each URL separately by clicking "ADD AN ITEM" for each one.

### 4. Optional: Add Your Custom Domain
If you plan to use a custom domain later (like `dressup.yourdomain.com`), add:
```
https://yourdomain.com/*
https://*.yourdomain.com/*
```

### 5. API Restrictions (Optional but Recommended)
Scroll down to **"API restrictions"**:
1. Select **"Restrict key"**
2. Check these APIs (only the ones you need):
   - Firebase Hosting API
   - Cloud Firestore API
   - Firebase Storage API
   - Cloud Functions API
   - Identity and Access Management (IAM) API

### 6. Save Changes
1. Click **"SAVE"** at the bottom
2. Wait for the confirmation message

## 🧪 Test Your Restrictions

### After saving, test that your app still works:

1. **Local testing**: Visit `http://localhost:3001` (your running dev server)
   - Upload photos
   - Generate an outfit
   - Should work normally

2. **Wrong domain test**: Try accessing your Firebase from a different domain
   - Should be blocked with an error

## 📱 What This Looks Like

### Before Restriction:
```
Application restrictions: None
```
❌ Anyone can use your API key from any website

### After Restriction:
```
Application restrictions: HTTP referrers (web sites)
- https://*.vercel.app/*
- https://localhost:3000/*
- https://localhost:3001/*
- http://localhost:3000/*
- http://localhost:3001/*
```
✅ Only your domains can use the API key

## 🚨 Important Notes

### Firebase API Keys Are Different
- Firebase API keys are **designed** to be public (unlike other API keys)
- They don't grant access to data - that's controlled by Firebase Security Rules
- Restriction is about preventing abuse, not hiding the key

### If You Make a Mistake
- You can always go back and edit the restrictions
- If you lock yourself out, remove all restrictions temporarily
- The API key itself doesn't change, just its usage rules

### When You Deploy to Vercel
Your Vercel URL will be something like: `https://dressup-delimatsuo.vercel.app`

The `*.vercel.app` restriction will cover this automatically.

## ⚠️ Troubleshooting

### "Access Denied" Error
If you see Firebase errors after adding restrictions:
1. Check that your current URL matches the restrictions
2. Wait 5-10 minutes for changes to propagate
3. Clear browser cache
4. Verify the URL format (include `/*` at the end)

### Can't Find the API Key
If you don't see the API key in the console:
1. Make sure you're in the right project (`projectdressup`)
2. Try this direct link: https://console.cloud.google.com/apis/credentials/key/[KEY_ID]?project=projectdressup
3. Check if it's under a different project

### Development vs Production
For development, you need both HTTP and HTTPS localhost:
- `http://localhost:3000/*` (Next.js default)
- `https://localhost:3000/*` (if using HTTPS locally)
- `http://localhost:3001/*` (your current dev server)

## 📋 Quick Checklist

- [ ] Opened Google Cloud Console credentials page
- [ ] Found the correct API key (starts with AIzaSyCymky...)
- [ ] Selected "HTTP referrers (web sites)"
- [ ] Added `https://*.vercel.app/*`
- [ ] Added `http://localhost:3000/*` and `https://localhost:3000/*`
- [ ] Added `http://localhost:3001/*` and `https://localhost:3001/*`
- [ ] Clicked "SAVE"
- [ ] Tested that localhost:3001 still works
- [ ] Ready to deploy to Vercel!

## 🎯 After Deployment

Once you deploy to Vercel and get your actual URL (e.g., `https://dressup-delimatsuo.vercel.app`), you can:
1. Go back to the API key settings
2. Add your specific URL: `https://dressup-delimatsuo.vercel.app/*`
3. This gives you extra specificity beyond the wildcard

---

**Time needed**: ~3 minutes  
**Difficulty**: Easy  
**Risk**: Very low (you can always undo restrictions)