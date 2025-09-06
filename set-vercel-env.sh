#!/bin/bash

# Remove existing environment variables
npx vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production --yes
npx vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID production --yes  
npx vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --yes
npx vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production --yes
npx vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID production --yes
npx vercel env rm NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production --yes
npx vercel env rm NEXT_PUBLIC_GCP_PROJECT_ID production --yes
npx vercel env rm NEXT_PUBLIC_GCP_PROJECT_NUMBER production --yes

# Add environment variables with values
echo "AIzaSyCymky2qcq-8x2VMKS4aFpIwXZXRGHq-t0" | npx vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
echo "projectdressup.firebaseapp.com" | npx vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production
echo "projectdressup" | npx vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
echo "projectdressup.firebasestorage.app" | npx vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production
echo "208976913089" | npx vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production
echo "1:208976913089:web:487ff6bdd07478a0866a40" | npx vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production
echo "G-27409KDVNL" | npx vercel env add NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID production
echo "projectdressup" | npx vercel env add NEXT_PUBLIC_GCP_PROJECT_ID production
echo "208976913089" | npx vercel env add NEXT_PUBLIC_GCP_PROJECT_NUMBER production

echo "Environment variables set successfully!"