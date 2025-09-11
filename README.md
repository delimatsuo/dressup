# DressUp - AI-Powered Virtual Outfit Try-On

A Next.js application that uses AI (Gemini) to allow users to virtually try on different outfits through AI-powered analysis and recommendations.

🔗 **Repository**: [https://github.com/delimatsuo/dressup](https://github.com/delimatsuo/dressup)

## Tech Stack

- **Frontend**: Next.js 15.5.2, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (migrating from Firebase to Vercel Edge Functions)
- **AI**: Google AI (Gemini 2.0 Flash) via Gemini API
- **Storage**: Vercel Blob Storage (migrating from Firebase Storage)
- **Hosting**: Vercel Platform
- **Testing**: Jest with SWC, React Testing Library, separate API/UI test configs
- **Session Management**: Vercel KV (planned)

## Project Structure

```
dressup/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes (try-on, upload, feedback)
│   │   └── page.tsx        # Main application page
│   ├── components/          # React components
│   │   ├── PhotoUploadInterface.tsx  # Multi-step photo upload
│   │   ├── MobilePhotoUpload.tsx     # Mobile-optimized upload
│   │   ├── GarmentGallery.tsx        # Outfit selection
│   │   ├── ResultsDisplay.tsx        # Results viewer
│   │   └── FeedbackSection.tsx       # User feedback
│   ├── lib/
│   │   ├── gemini.ts       # Gemini AI integration
│   │   └── tryon-processing.ts # Try-on processing logic
│   └── hooks/              # Custom React hooks
├── tests/                   # Test files (API and lib tests)
├── jest.config.ui.js       # UI test configuration
├── jest.config.api.js      # API test configuration
├── public/                  # Static assets
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
- ✅ Firebase SDK integration with Cloud Functions
- ✅ Vertex AI integration configured for Gemini 2.5 Flash Image
- ✅ Cloud Firestore for data storage
- ✅ Basic session ID generation
- ✅ Garment gallery with 10 sample items
- ✅ Single photo upload functionality
- ✅ Basic feedback collection (single rating)
- ✅ Comprehensive test suite (TDD approach)
- ✅ Responsive design with Tailwind CSS
- ✅ Deployed to Firebase Hosting

### Features Per PRD Not Yet Implemented
- ⏳ Multi-pose generation (Standing Front, Standing Side, Walking Side)
- ⏳ Session management with 60-minute expiry
- ⏳ Multi-photo upload (front, side, back views)
- ⏳ Automatic photo deletion after 60 minutes
- ⏳ Dual feedback scoring (realism + helpfulness)
- ⏳ Actual image generation with Gemini 2.5 Flash Image
- ⏳ Firebase Storage lifecycle rules for privacy

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
