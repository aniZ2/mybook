// scripts/uploadToAlgolia.ts
import { config } from 'dotenv';
config({ path: '.env.local' });

import algoliasearch from 'algoliasearch';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY,
  ALGOLIA_INDEX_NAME = 'books',
} = process.env;

// ───────────── Firebase Admin Setup ─────────────
if (!admin.apps.length) admin.initializeApp();
const db = getFirestore();

// ───────────── Algolia Client ─────────────
if (!ALGOLIA_APP_ID || !ALGOLIA_ADMIN_KEY) {
  throw new Error('❌ Missing Algolia credentials');
}
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex(ALGOLIA_INDEX_NAME);

(async () => {
  try {
    console.log('📚 Fetching books from Firestore...');
    const snap = await db.collection('books').get();

    const books = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        objectID: doc.id,
        title: d.title,
        authors: [d.authorName].filter(Boolean),
        cover: d.coverUrl || null,
        slug: d.slug || doc.id,
        description: d.description || '',
        genres: d.genres || [],
        source: 'firestore',
      };
    });

    if (books.length === 0) {
      console.log('⚠️ No books found in Firestore.');
      process.exit(0);
    }

    console.log(`📤 Uploading ${books.length} books to Algolia index "${ALGOLIA_INDEX_NAME}"...`);
    await index.saveObjects(books);
    console.log('✅ Upload complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Upload error:', err);
    process.exit(1);
  }
})();
