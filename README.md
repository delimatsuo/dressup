# DressUp - AI-Powered Virtual Outfit Try-On

A Next.js application that uses AI (Gemini) to allow users to virtually try on different outfits through photo manipulation.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Firebase Cloud Functions (2nd Gen)
- **AI**: Google Vertex AI (Gemini)
- **Storage**: Firebase Cloud Storage
- **Hosting**: Firebase Hosting
- **Testing**: Jest, React Testing Library

## Project Structure

```
dressup/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   │   ├── UploadArea.tsx  # Photo upload component
│   │   ├── GarmentGallery.tsx # Outfit selection
│   │   ├── ResultsDisplay.tsx  # Results viewer
│   │   └── FeedbackSection.tsx # User feedback
│   └── lib/
│       └── firebase.ts      # Firebase configuration
├── tests/                   # Test files
├── public/                  # Static assets
└── .taskmaster/            # Task management
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

This project follows TDD methodology. Tests are written before implementation:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- UploadArea.test.tsx
```

## Features

### Current Features (Implemented)
- ✅ Next.js application scaffold with TypeScript
- ✅ Component structure for main UI elements
- ✅ Firebase SDK integration (ready for credentials)
- ✅ Mock data for development without Firebase
- ✅ Session tracking for analytics
- ✅ Comprehensive test suite (TDD approach)
- ✅ Responsive design with Tailwind CSS

### Pending Features (Requires Firebase Setup)
- ⏳ Image upload to Firebase Storage
- ⏳ Gemini AI integration for outfit processing
- ⏳ Cloud Functions for backend processing
- ⏳ Real-time feedback collection
- ⏳ Production deployment

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

## Contributing

1. Follow TDD methodology - write tests first
2. Ensure all tests pass before committing
3. Update documentation for new features
4. Use Task Master for tracking progress

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [React Documentation](https://react.dev)

## License

[License Type] - See LICENSE file for details