import * as admin from "firebase-admin";
import { getFirestore, Firestore } from "firebase-admin/firestore";

let app: admin.app.App | undefined;
let adminDb: Firestore | null = null;

const serviceAccountString = process.env.SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (!serviceAccountString) {
    console.warn("⚠️ Skipping Firebase Admin init — SERVICE_ACCOUNT_JSON not found (build stage).");
  } else {
    try {
      const credentials = JSON.parse(serviceAccountString);
      app = admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
      adminDb = getFirestore();
      console.log("✅ Firebase Admin initialized successfully");
    } catch (error) {
      console.error("❌ Failed to parse or initialize Firebase Admin SDK:", error);
    }
  }
} else {
  app = admin.app(); // reuse existing instance
  adminDb = getFirestore(); // Make sure to get the Firestore instance here too
  if (process.env.NODE_ENV === "development") {
    console.log("🧩 Firebase Admin already initialized — reusing existing app.");
  }
}

// Export with proper types - always export something, never undefined
export const dbAdmin: Firestore | null = adminDb;
export { app, admin };

// If you need a default export
export default app;