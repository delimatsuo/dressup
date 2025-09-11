# DressUp - AI-Powered Virtual Outfit Try-On

A Next.js application that uses AI (Gemini) to allow users to virtually try on different outfits through AI-powered analysis and recommendations.

🔗 **Repository**: [https://github.com/delimatsuo/dressup](https://github.com/delimatsuo/dressup)

## Tech Stack

- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Vercel Edge Functions
- **AI**: Google AI (Gemini 2.5 Flash Image Preview) for image generation
- **Storage**: Vercel Blob Storage with automatic 30-minute cleanup
- **Session Management**: Vercel KV Redis with TTL support
- **Hosting**: Vercel Platform with Edge Runtime
- **Testing**: Jest with SWC, React Testing Library, separate API/UI test configs
- **Rate Limiting**: Sliding window algorithm with Vercel KV

## Project Structure

```
dressup/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   │   ├── try-on/     # AI try-on endpoint with Gemini
│   │   │   ├── upload/     # Image upload with Blob storage
│   │   │   ├── session/    # Session management with KV
│   │   │   ├── feedback/   # User feedback collection
│   │   │   └── cron/       # Automatic cleanup jobs
│   │   └── page.tsx        # Main application page
│   ├── components/          # React components
│   │   ├── PhotoUploadInterface.tsx  # Multi-step photo upload
│   │   ├── MobilePhotoUpload.tsx     # Mobile-optimized upload
│   │   ├── GarmentGallery.tsx        # Outfit selection
│   │   ├── ResultsDisplay.tsx        # Results viewer
│   │   └── FeedbackSection.tsx       # User feedback
│   ├── lib/
│   │   ├── gemini.ts       # Gemini 2.5 Flash Image Preview
│   │   ├── blob-storage.ts # Vercel Blob with auto-cleanup
│   │   ├── session.ts      # Session management with KV
│   │   ├── rate-limit.ts   # Rate limiting implementation
│   │   └── tryon-processing.ts # Try-on processing logic
│   └── hooks/              # Custom React hooks
├── tests/                   # Comprehensive test suite
├── vercel.json             # Vercel configuration & cron jobs
├── jest.config.ui.js       # UI test configuration
├── jest.config.api.js      # API test configuration
└── .taskmaster/            # Task management and progress tracking
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- GCP account with billing enabled

### Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd dressup
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
```bash
# Copy the example env file
cp .env.local.example .env.local

# Add your Firebase credentials to .env.local
```

4. Initialize Firebase (when credentials are available):
```bash
firebase init
# Select: Functions, Hosting, Storage
# Choose existing project or create new
```

## Development

### Running Locally

```bash
# Start development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint code
npm run lint

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Testing

This project follows TDD methodology with separate test configurations for UI and API:

```bash
# Run all tests
npm test

# Run UI tests only
npm run test:ui

# Run API tests only  
npm run test:api

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/__tests__/UploadArea.test.tsx
```

**Test Coverage Status (as of latest commit):**
- Overall: 83.5% (96/115 tests passing)
- UI Components: Most components fully tested
- API Routes: Core functionality tested
- Known Issues: Complex integration tests for PhotoUploadInterface and responsive behavior

## Features

### Current Features (Implemented)
- ✅ Next.js application scaffold with TypeScript
- ✅ Component structure for main UI elements  
- ✅ **Vercel Edge Functions** for all API routes
- ✅ **Gemini 2.5 Flash Image Preview** integration for actual image generation
- ✅ **Vercel KV** for session management with 30-minute TTL
- ✅ **Vercel Blob Storage** with automatic cleanup (30-minute expiry)
- ✅ Session tracking and restoration for page refreshes
- ✅ Garment gallery with 10 sample items
- ✅ Multi-photo upload support (front, side, back views)
- ✅ Image optimization and format conversion (JPEG, PNG, WebP, HEIC)
- ✅ Thumbnail generation for uploaded images
- ✅ Rate limiting with sliding window algorithm
- ✅ Automatic cleanup via cron jobs (every 15 minutes)
- ✅ Secure URL generation with expiration
- ✅ Comprehensive test suite (83.5% coverage)
- ✅ Responsive design with mobile optimization
- ✅ Error handling and validation across all endpoints

### Features In Progress
- 🔄 Multi-pose generation with Gemini (front, side, walking)
- 🔄 Enhanced feedback collection (realism + helpfulness scores)
- 🔄 Production deployment to Vercel

### Features Planned
- ⏳ Advanced garment type detection (formal, casual, athletic, etc.)
- ⏳ Background enhancement options
- ⏳ Batch processing for multiple outfits
- ⏳ Export and sharing functionality

## Task Management

This project uses Task Master AI for task tracking:

```bash
# View current tasks
task-master list

# Get next task
task-master next

# Mark task complete
task-master set-status --id=<id> --status=done
```

## Environment Variables

Required environment variables (add to `.env.local`):

```env
# Google AI (Gemini) Configuration
GOOGLE_AI_API_KEY=your-gemini-api-key

# Vercel KV (Redis) Configuration
KV_REST_API_URL=your-kv-rest-api-url
KV_REST_API_TOKEN=your-kv-rest-api-token

# Vercel Blob Storage Configuration
BLOB_READ_WRITE_TOKEN=your-blob-token

# Optional: Cron Job Authentication
CRON_SECRET=your-cron-secret
ADMIN_API_KEY=your-admin-api-key

# Legacy Firebase (if still using)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

## Deployment

### Deploy on Firebase

Once Firebase credentials are configured:

```bash
# Build the application
npm run build

# Deploy to Firebase
firebase deploy
```

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Architecture

The application follows a clean architecture pattern:

1. **Frontend (Next.js)**: Handles UI and user interactions
2. **Firebase Storage**: Stores user-uploaded images and results
3. **Cloud Functions**: Processes images using Gemini AI
4. **Gemini API**: Performs the AI-powered outfit transformation

## Important Architecture Notes

⚠️ **NO ARCHITECTURE CHANGES WITHOUT APPROVAL**: The tech stack and architecture decisions are final. Do not change:
- Gemini 2.5 Flash Image model (not 1.5 Pro or any other model)
- Firebase/GCP infrastructure choices
- Next.js/React framework
- Any core technology decisions

All changes to architecture or tech stack require explicit approval from the project owner.

## Contributing

1. Follow TDD methodology - write tests first
2. Ensure all tests pass before committing
3. Update documentation for new features
4. Use Task Master for tracking progress
5. **Never change architecture or tech stack without explicit approval**

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [React Documentation](https://react.dev)

## License

[License Type] - See LICENSE file for details# Vercel deployment trigger Sat Sep  6 15:40:31 EDT 2025
