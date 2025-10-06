// scripts/uploadToAlgolia.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import algoliasearch from 'algoliasearch';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const {
  NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID,
  NEXT_PUBLIC_ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  ALGOLIA_INDEX_NAME,
} = process.env;

// Validate Firebase credentials
if (!NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
  throw new Error('❌ Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local file');
}

if (!NEXT_PUBLIC_FIREBASE_API_KEY) {
  throw new Error('❌ Missing NEXT_PUBLIC_FIREBASE_API_KEY in .env.local file');
}

// Validate Algolia credentials
if (!NEXT_PUBLIC_ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  throw new Error('❌ Missing Algolia credentials in .env.local file');
}

const firebaseConfig = {
  apiKey: NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔧 Firebase Project ID:', NEXT_PUBLIC_FIREBASE_PROJECT_ID);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const client = algoliasearch(
  NEXT_PUBLIC_ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY
);
const index = client.initIndex(ALGOLIA_INDEX_NAME || 'books');

(async () => {
  try {
    console.log('📚 Fetching books from Firestore...');
    const snap = await getDocs(collection(db, 'books'));
    const books = snap.docs.map((doc) => ({
      objectID: doc.id,
      ...doc.data(),
    }));

    if (books.length === 0) {
      console.log('⚠️ No books found in Firestore.');
      process.exit(0);
    }

    console.log(`📤 Uploading ${books.length} books to Algolia...`);
    
    await index.saveObjects(books);
    
    console.log('✅ Upload complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();