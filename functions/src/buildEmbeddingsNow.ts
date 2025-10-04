import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

export const buildEmbeddingsNow = onCall(
  async (request: CallableRequest<{ limit?: number }>) => {
    // ✅ The callable request already contains `auth` and `data`
    const { auth, data } = request;

    if (!auth?.uid) {
      throw new HttpsError(
        "unauthenticated",
        "You must be signed in to trigger embeddings build."
      );
    }

    const uid = auth.uid;

    // Optional admin validation
    const adminSnap = await db.collection("admins").doc(uid).get();
    if (!adminSnap.exists) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can trigger this action."
      );
    }

    const limit = Number(data?.limit || 50);
    if (isNaN(limit) || limit <= 0) {
      throw new HttpsError("invalid-argument", "Invalid limit parameter.");
    }

    console.log(`🔹 Embedding build triggered by ${uid} with limit=${limit}`);

    const booksSnap = await db
      .collection("books")
      .where("embeddingReady", "==", false)
      .limit(limit)
      .get();

    if (booksSnap.empty) {
      return { message: "No new books found for embedding." };
    }

    const batch = db.batch();

    for (const doc of booksSnap.docs) {
      const data = doc.data();
      const text = `${data.title || ""} ${data.description || ""}`.trim();

      // Placeholder vector – swap for actual OpenAI embedding if desired
      const fakeVector = Array.from({ length: 1536 }, () => Math.random());

      batch.update(doc.ref, {
        embeddingReady: true,
        embedding: fakeVector,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`✅ Embeddings updated for ${booksSnap.size} books.`);
    return { message: `Processed ${booksSnap.size} books successfully.` };
  }
);
