"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEmbeddingsNow = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
exports.buildEmbeddingsNow = (0, https_1.onCall)(async (request) => {
    // ✅ The callable request already contains `auth` and `data`
    const { auth, data } = request;
    if (!auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "You must be signed in to trigger embeddings build.");
    }
    const uid = auth.uid;
    // Optional admin validation
    const adminSnap = await db.collection("admins").doc(uid).get();
    if (!adminSnap.exists) {
        throw new https_1.HttpsError("permission-denied", "Only admins can trigger this action.");
    }
    const limit = Number(data?.limit || 50);
    if (isNaN(limit) || limit <= 0) {
        throw new https_1.HttpsError("invalid-argument", "Invalid limit parameter.");
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
});
