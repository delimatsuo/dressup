const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
const serviceAccount = require('../serviceAccount.json'); // You'll need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'project-friday-471118.appspot.com'
});

const db = admin.firestore();

// Sample garment data
const garments = [
  {
    name: 'Classic White T-Shirt',
    category: 'casual',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/white-tshirt.jpg',
    description: 'A timeless white cotton t-shirt perfect for casual wear'
  },
  {
    name: 'Business Suit - Navy',
    category: 'formal',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/navy-suit.jpg',
    description: 'Professional navy blue business suit'
  },
  {
    name: 'Summer Floral Dress',
    category: 'casual',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/floral-dress.jpg',
    description: 'Light and airy floral dress perfect for summer'
  },
  {
    name: 'Evening Gown - Black',
    category: 'formal',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/black-gown.jpg',
    description: 'Elegant black evening gown for special occasions'
  },
  {
    name: 'Denim Jacket',
    category: 'casual',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/denim-jacket.jpg',
    description: 'Classic denim jacket for a casual cool look'
  },
  {
    name: 'Athletic Wear Set',
    category: 'sports',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/athletic-set.jpg',
    description: 'Comfortable athletic wear for workouts'
  },
  {
    name: 'Cocktail Dress - Red',
    category: 'formal',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/red-cocktail.jpg',
    description: 'Stunning red cocktail dress'
  },
  {
    name: 'Casual Hoodie',
    category: 'casual',
    imageUrl: 'https://storage.googleapis.com/project-friday-471118.appspot.com/garments/hoodie.jpg',
    description: 'Comfortable hoodie for relaxed days'
  }
];

async function setupGarments() {
  console.log('Setting up garments in Firestore...');
  
  try {
    // Clear existing garments
    const existingGarments = await db.collection('garments').get();
    const batch = db.batch();
    existingGarments.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('Cleared existing garments');

    // Add new garments
    for (const garment of garments) {
      const docRef = await db.collection('garments').add({
        ...garment,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`Added garment: ${garment.name} (${docRef.id})`);
    }

    console.log('✅ Successfully set up all garments!');
  } catch (error) {
    console.error('❌ Error setting up garments:', error);
  } finally {
    process.exit();
  }
}

setupGarments();