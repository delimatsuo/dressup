#!/usr/bin/env node

/**
 * Script to seed sample garment data to Firestore
 * Run from functions directory: cd functions && node seed-garments.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize admin with service account
const serviceAccount = require('./serviceAccount.json');

// Use the Firebase project ID, not the GCP project
// The service account is from projectdressup but we're using project-friday-471118 for Firestore
admin.initializeApp({
  credential: admin.credential.cert({
    ...serviceAccount,
    project_id: 'project-friday-471118' // Override to use Firebase project
  }),
  projectId: 'project-friday-471118',
  storageBucket: 'project-friday-471118.appspot.com'
});

const db = admin.firestore();

// Sample garment data
const garments = [
  {
    name: 'Classic White T-Shirt',
    category: 'tops',
    description: 'A versatile white cotton t-shirt perfect for any casual outfit',
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    tags: ['casual', 'basic', 'cotton', 'white'],
    price: 29.99
  },
  {
    name: 'Blue Denim Jeans',
    category: 'bottoms',
    description: 'Classic straight-fit blue jeans with a comfortable stretch',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
    tags: ['denim', 'casual', 'blue', 'jeans'],
    price: 79.99
  },
  {
    name: 'Little Black Dress',
    category: 'dresses',
    description: 'Elegant black dress suitable for evening events',
    imageUrl: 'https://images.unsplash.com/photo-1566479179474-987a6f9c0c3e?w=800',
    tags: ['formal', 'evening', 'black', 'elegant'],
    price: 149.99
  },
  {
    name: 'Floral Summer Dress',
    category: 'dresses',
    description: 'Light and breezy floral pattern dress perfect for summer',
    imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800',
    tags: ['summer', 'floral', 'casual', 'light'],
    price: 89.99
  },
  {
    name: 'Navy Blazer',
    category: 'outerwear',
    description: 'Professional navy blue blazer for business casual looks',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800',
    tags: ['formal', 'business', 'navy', 'blazer'],
    price: 199.99
  },
  {
    name: 'Striped Button-Up Shirt',
    category: 'tops',
    description: 'Blue and white striped cotton shirt with button closure',
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800',
    tags: ['business', 'stripes', 'cotton', 'formal'],
    price: 59.99
  },
  {
    name: 'Black Leather Jacket',
    category: 'outerwear',
    description: 'Edgy black leather jacket with zipper details',
    imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
    tags: ['leather', 'black', 'edgy', 'jacket'],
    price: 299.99
  },
  {
    name: 'Khaki Chinos',
    category: 'bottoms',
    description: 'Versatile khaki chino pants for smart casual wear',
    imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800',
    tags: ['chinos', 'khaki', 'casual', 'cotton'],
    price: 69.99
  },
  {
    name: 'Red Cocktail Dress',
    category: 'dresses',
    description: 'Stunning red dress perfect for cocktail parties',
    imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    tags: ['cocktail', 'red', 'party', 'elegant'],
    price: 179.99
  },
  {
    name: 'Denim Jacket',
    category: 'outerwear',
    description: 'Classic blue denim jacket for layered casual looks',
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800',
    tags: ['denim', 'casual', 'jacket', 'blue'],
    price: 89.99
  }
];

async function seedGarments() {
  console.log('🌱 Starting to seed garment data...\n');
  
  const batch = db.batch();
  const garmentsRef = db.collection('garments');
  
  // Clear existing garments (optional)
  const existing = await garmentsRef.get();
  if (!existing.empty) {
    console.log(`⚠️  Found ${existing.size} existing garments. Clearing...\n`);
    existing.forEach(doc => {
      batch.delete(doc.ref);
    });
  }
  
  // Add new garments
  garments.forEach((garment, index) => {
    const docRef = garmentsRef.doc();
    batch.set(docRef, {
      ...garment,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      popularity: Math.floor(Math.random() * 100), // Random popularity score
      inStock: true
    });
    console.log(`✓ Adding: ${garment.name} (${garment.category})`);
  });
  
  // Commit the batch
  try {
    await batch.commit();
    console.log(`\n✅ Successfully seeded ${garments.length} garments to Firestore!`);
    console.log('\n📊 Categories breakdown:');
    
    const categories = garments.reduce((acc, g) => {
      acc[g.category] = (acc[g.category] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`   - ${cat}: ${count} items`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the seeding
seedGarments();