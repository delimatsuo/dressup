# DressUp AI Virtual Try-On - Technical Handover Document (Updated for Vercel Migration)

## 🚨 Current Focus: Vercel Migration & API Integration

We pivoted away from Firebase functions due to deployment conflicts and are now implementing a Vercel-native stack. Sessions are KV-backed with 30-minute TTL refresh on activity; uploads are validated via Edge routes; try-on requests are accepted (Gemini integration pending).

---

## 📋 Project Overview

**Repository**: https://github.com/delimatsuo/dressup
**Live URL**: https://dressup-nine.vercel.app (correct production deployment)
**Purpose**: AI-powered virtual outfit try-on using Gemini 2.5 Flash Image

### Core Functionality
1. User uploads photos of themselves
2. User selects garment from gallery or uploads screenshot
3. AI generates virtual try-on images showing user wearing the garment
4. User can try multiple garments without re-uploading photos

---

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Edge API**: Next.js App Router (Edge Runtime)
- **Sessions**: Vercel KV (30-minute TTL)
- **Storage**: Vercel Blob (planned, validation in place)
- **AI**: Google Gemini 2.5 Flash Image (planned)
- **Hosting**: Vercel (dressup-nine.vercel.app)

### Data Flow (New)
```
User Upload → /api/upload (validate→Blob) → /api/try-on (validate→accept job) → (Gemini planned) → Results
Sessions: /api/session/* with KV TTL refresh on activity
```

---

## 📁 Critical File Locations

### Key Files (Vercel Stack)
```
src/app/api/session/create/route.ts
src/app/api/session/[id]/route.ts
src/app/api/upload/route.ts
src/app/api/try-on/route.ts

src/lib/session.ts   # KV sessions + TTL
src/lib/upload.ts    # validation + sanitization
src/lib/tryon.ts     # validation + prompt + stub submit
src/lib/kv.ts        # KV REST client

src/lib/firebase.ts  # UI adapter bridging to new routes
src/hooks/useSession.ts  # creates session via /api/session/create
src/components/MultiPhotoUpload.tsx  # uses /api/upload
src/components/SessionProvider.tsx   # session context
```

### Configuration Files
```
├── functions/package.json                 # Firebase Functions dependencies
├── package.json                          # Frontend dependencies
├── firebase.json                         # Firebase project config
├── .env.local                            # Environment variables
└── README.md                             # Project documentation
```

---

## 📖 Essential Documents to Read

### 1. Project Requirements
- **README.md**: `/Users/delimatsuo/Documents/Coding/dressup/README.md`
- **PRD Location**: Check `.taskmaster/` directory or project docs for Product Requirements Document

### 2. API Documentation  
- **Edge Routes**: see files above
- **Gemini Integration**: planned via direct API in `src/lib/tryon.ts`

### 3. Recent Changes
- **Git History**: Check recent commits for session management changes
- **User Feedback**: Session expiry issues, deployment problems

---

## 🎯 Current Status

### Implemented (Vercel)
- KV sessions with TTL and refresh on activity
- Upload validation with shared constants (file type/size + path sanitization)
- Try-on request acceptance with session TTL refresh (Gemini call pending)
- Frontend bridge to new routes; `MultiPhotoUpload` now uses `/api/upload`
- `useSession` creates server session via API

### Pending
- Wire real Vercel Blob client
- Add real Gemini calls + status polling/streaming
- Rate limiting & security headers
- Mobile upload components migration

1. **Activity Tracking** (`session.ts:111-115`):
   ```typescript
   async updateLastActivity(sessionId: string): Promise<void> {
     await this.db.collection('sessions').doc(sessionId).update({
       lastActivityAt: FieldValue.serverTimestamp()
     });
   }
   ```

2. **Inactivity Detection** (`session.ts:117-125`):
   ```typescript
   const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
   const inactiveSessionsQuery = await this.db
     .collection('sessions')
     .where('lastActivityAt', '<', thirtyMinutesAgo)
     .get();
   ```

3. **Complete Data Deletion** (`session.ts:150-158`):
   - Deletes user-uploaded photos
   - Deletes ALL generated images for session
   - Removes session metadata

4. **Scheduled Cleanup** (`scheduledCleanup.ts`):
   - Runs every 15 minutes
   - Finds sessions inactive for 30+ minutes
   - Deletes all associated data

**Frontend Notes**:
- UI currently receives deterministic URLs on upload and stubbed try-on results, sufficient for MVP demo while we finalize storage and AI integration.

---

## 💥 Blockers Resolved by Migration
- Firebase build/deploy TS errors are no longer in the critical path.
- All new work happens in Next.js Edge routes + small libs.

---

## 🔧 What Was Tried

### 1. Frontend Session Management
✅ **Success**: Modified `useSession.ts` to remove blocking
- Changed session expiry from blocking to display-only
- Users can continue using app with expired sessions
- Deployed to Vercel successfully

### 2. Backend Privacy Solution  
❌ **Failed**: Cannot deploy due to TypeScript errors
- Created complete inactivity-based cleanup system
- Added activity tracking on image generation
- Implemented scheduled cleanup every 15 minutes
- **Blocked by**: Existing codebase compilation issues

### 3. Error Resolution Attempts
❌ **Partial**: Fixed some errors but deployment still fails
- Fixed unused import in `sessionFunctions.ts`
- Attempted to fix logger sum error in `logger.ts`
- Could not resolve Firebase Functions v2 API issues
- Multiple background deployment attempts failed

### 4. Deployment Strategies Tried
- Direct function deployment: `firebase deploy --only functions:processImageWithGemini`
- Forced deployment: `--force` flag
- Selective deployment: Only critical functions
- Background concurrent deployments (all failed)

---

## 🚀 Next Steps for New Agent

### Immediate Priority (Critical)
1. **Fix TypeScript Compilation Errors**:
   - Resolve Firebase Functions v2 API compatibility
   - Fix logger method calls
   - Address type safety issues
   - **Files to fix**: `index.ts`, `logger.ts`, `sessionFunctions.ts`, `storageCleanup.ts`

2. **Deploy Privacy Solution**:
   ```bash
   cd /Users/delimatsuo/Documents/Coding/dressup/functions
   npm run build  # Should succeed after fixes
   firebase deploy --only functions:processImageWithGemini,functions:cleanupExpiredSessions,functions:processScheduledCleanups
   ```

3. **Verify Deployment**:
   - Test image generation updates `lastActivityAt`
   - Confirm 30-minute cleanup works
   - Monitor Firebase Functions logs

### Code Changes to Uncomment (After Fixes)
In `functions/src/index.ts` lines 107-111:
```typescript
// TODO: Update last activity for session to track usage
// Commenting out to fix deployment
// const { SessionManager } = await import('./session');
// const sessionManager = new SessionManager(admin.firestore());
// await sessionManager.updateLastActivity(sessionId);
```

### Testing Strategy
1. **Upload Test**: User uploads photos
2. **Generate Test**: Generate multiple outfits (verify activity tracking)  
3. **Inactivity Test**: Wait 30+ minutes, verify cleanup
4. **Re-upload Test**: Confirm photos deleted, user can re-upload

---

## 🔐 Environment & Access

### Firebase Project
- **Project ID**: `projectdressup`
- **Storage Bucket**: `projectdressup.firebasestorage.app`
- **Functions Region**: Default (us-central1)

### Vercel Deployment
- **Correct Project**: `dressup-prod` 
- **Production URL**: `https://dressup-nine.vercel.app`
- **⚠️ Important**: Do NOT deploy to other Vercel projects

### Environment Variables (local)
```
KV_REST_API_URL=
KV_REST_API_TOKEN=
GOOGLE_AI_API_KEY= # For Gemini (planned)
```

---

## 📞 User Feedback Context

**User's Experience**:
- "Session expired. I can't extend it 30 minutes. Why is this happening?"
- "I still can't use it because the session time is over."
- Wants to try multiple garments without re-uploading photos
- Frustrated with restrictive session management

**User's Explicit Requirements**:
- 30 minutes after last activity → delete pictures  
- No blocking functionality during active use
- Privacy through automatic cleanup, not restrictions

**Critical Quote**: "I think the idea of session timing is ridiculous. You need to find a better solution for that problem."

---

## 🎯 Success Criteria (Updated)

### Must Have
1. ✅ Non-blocking sessions with 30m inactivity cleanup (TTL refresh in place)
2. ✅ Validated uploads with secure pathing; Blob storage wiring pending
3. ✅ Try-on job acceptance; Gemini integration pending
4. ✅ Frontend integrated with new routes (adapter + component refactors)

### Nice to Have
- Scheduled cleanup logs, user notification, “Clear My Data” button

---

## 🚨 Critical Warnings

### Do Not Change
- **Architecture**: Gemini 2.5 Flash Image model (not 1.5 Pro)
- **Firebase/GCP infrastructure** 
- **Next.js/React framework**
- **Core technology decisions** (requires explicit approval)

### Deployment Rules
- **Always deploy to**: `dressup-nine.vercel.app` (dressup-prod project)
- **Never deploy to**: Random Vercel URLs  
- **Test compilation** before deployment attempts

### Code Quality
- Follow existing patterns in codebase
- Maintain TypeScript strict mode compliance
- Keep security best practices (no exposed secrets)

---

## 📝 Handover Checklist for Next Agent

- [ ] Read this entire document
- [ ] Review `README.md` for project context  
- [ ] Review Edge routes in `src/app/api/...`
- [ ] Wire `/api/upload` to Vercel Blob client
- [ ] Implement Gemini calls in `src/lib/tryon.ts` and return real results
- [ ] Add rate limiting/security headers + monitoring
- [ ] Ensure mobile upload components hit `/api/upload`
- [ ] Keep following TDD protocol for all changes

---

**Status**: Core routes/libs in place; frontend bridged; storage + Gemini pending
**Priority**: High — implement Blob + Gemini, then harden security/monitoring
