# 🖼️ Visual Guide: API Key Restrictions

## What You'll See Step by Step

### Step 1: Google Cloud Console Homepage
```
🌐 https://console.cloud.google.com/apis/credentials?project=projectdressup

[Google Cloud Console Header]
📍 projectdressup | ⚙️ Settings | 👤 Your Account

Navigation: APIs & Services > Credentials
```

### Step 2: Credentials Page
```
🔑 Credentials

📝 Create Credentials [Button]

📋 Credential List:
┌─────────────────────────────────────────────────┐
│ Name                    Type      Created        │
│ ─────────────────────── ───────── ─────────────  │
│ 📱 Browser key          API key   [Date]     ✏️  │
│ 🔧 Service Account Key  JSON      [Date]     ✏️  │
│ 🔒 OAuth 2.0 Client     OAuth     [Date]     ✏️  │
└─────────────────────────────────────────────────┘
```
**👆 Click the ✏️ pencil icon next to "API key"**

### Step 3: API Key Details Page
```
🔑 Edit API key

Key: AIzaSyCymky2qcq-8x2VMKS4aFpIwXZXRGHq-t0 [Copy]

📱 Application restrictions
○ None ← (Currently selected - BAD!)
● HTTP referrers (web sites) ← (Select this!)
○ IP addresses
○ Android apps
○ iOS apps

🌐 Website restrictions
┌────────────────────────────────────────────┐
│ [Empty list - need to add URLs]           │
│                                            │
│ [+ ADD AN ITEM] ← Click this button        │
└────────────────────────────────────────────┘
```

### Step 4: After Clicking "ADD AN ITEM"
```
🌐 Website restrictions
┌────────────────────────────────────────────┐
│ 📝 [Type URL here]                    [x]  │
│                                            │
│ [+ ADD AN ITEM]                            │
└────────────────────────────────────────────┘
```
**👆 Type: `https://*.vercel.app/*` then press Enter**

### Step 5: Add All Required URLs
```
🌐 Website restrictions
┌────────────────────────────────────────────┐
│ ✅ https://*.vercel.app/*             [x]  │
│ ✅ http://localhost:3000/*            [x]  │
│ ✅ https://localhost:3000/*           [x]  │
│ ✅ http://localhost:3001/*            [x]  │
│ ✅ https://localhost:3001/*           [x]  │
│                                            │
│ [+ ADD AN ITEM]                            │
└────────────────────────────────────────────┘
```

### Step 6: API Restrictions (Optional)
```
🔧 API restrictions
○ Don't restrict key ← (Default)
● Restrict key ← (Select for better security)

Select APIs:
☑️ Cloud Firestore API
☑️ Firebase Hosting API  
☑️ Firebase Storage API
☑️ Cloud Functions API
☐ Other APIs... (uncheck unused ones)
```

### Step 7: Save
```
[💾 SAVE] ← Click this button at the bottom
[📝 CANCEL]
```

## What Success Looks Like

### Before (Insecure):
```
🔑 API Key: AIzaSyCymky...
📱 Application restrictions: None
⚠️  Status: Unrestricted - Anyone can use this key
```

### After (Secure):
```
🔑 API Key: AIzaSyCymky...
📱 Application restrictions: HTTP referrers (web sites)
   ✅ https://*.vercel.app/*
   ✅ http://localhost:3000/*
   ✅ https://localhost:3000/*
   ✅ http://localhost:3001/*
   ✅ https://localhost:3001/*
🛡️  Status: Restricted to specified domains
```

## 🧪 Testing

### Test Your Local App (Should Work):
```
🌐 http://localhost:3001
✅ App loads
✅ Firebase connects
✅ Can upload photos
✅ Can generate outfits
```

### Test from Wrong Domain (Should Fail):
```
🌐 https://example.com (trying to use your API key)
❌ Firebase Error: "API key not valid for this referrer"
✅ Your key is protected!
```

## 🚨 Common Issues & Fixes

### Issue: "Can't find API key"
```
Solution:
1. Make sure project selector shows "projectdressup"
2. Try: APIs & Services > Credentials
3. Look for Type = "API key"
```

### Issue: "Access denied after restriction"
```
Possible causes:
- URL format wrong (missing /* at end)
- Browser cache (clear it)
- Need to wait 5-10 minutes for changes
- Localhost port different than expected
```

### Issue: "Wrong project selected"
```
Look at top of page:
[📍 wrong-project ⬇️] ← Click dropdown
[📍 projectdressup ⬇️] ← Select this one
```

## 📋 Copy-Paste URLs

For easy copy-paste when adding restrictions:

```
https://*.vercel.app/*
http://localhost:3000/*
https://localhost:3000/*
http://localhost:3001/*
https://localhost:3001/*
```

**Add each URL separately** - don't paste them all at once.

---

**Total time**: 3-5 minutes  
**Difficulty**: Beginner friendly  
**Impact**: Major security improvement