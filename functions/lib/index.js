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
exports.onBookWrite = exports.refreshTrendingPool = exports.cleanupOldSearchEvents = exports.aggregateTrendingScore = exports.onAnnouncementDeleted = exports.onAnnouncementCreated = exports.onBookCommentDeleted = exports.onBookCommentCreated = exports.onPostCommentDeleted = exports.onPostCommentCreated = exports.onBookLikeDeleted = exports.onBookLikeCreated = exports.onPostLikeDeleted = exports.onPostLikeCreated = exports.onBookDeleted = exports.onBookCreated = exports.onFollowingDeleted = exports.onFollowingCreated = exports.onFollowerDeleted = exports.onFollowerCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const options_1 = require("firebase-functions/v2/options");
const admin = __importStar(require("firebase-admin"));
const firestore_2 = require("firebase-admin/firestore");
const algoliasearch_1 = require("algoliasearch");
// ─────────────────────────────
// ⚙️ Global Options
// ─────────────────────────────
(0, options_1.setGlobalOptions)({
    region: "us-central1",
    timeoutSeconds: 540,
    memory: "512MiB",
});
// ─────────────────────────────
// 🔥 Admin Init (single)
// ─────────────────────────────
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
// ─────────────────────────────
// 🔍 Algolia Setup (v5, untouched logic)
// ─────────────────────────────
const ALGOLIA_APP_ID = process.env.ALGOLIA_APP_ID || "";
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY || "";
const ALGOLIA_INDEX_NAME = process.env.ALGOLIA_INDEX_NAME || "books";
let algoliaClient = null;
if (ALGOLIA_APP_ID && ALGOLIA_ADMIN_KEY) {
    algoliaClient = (0, algoliasearch_1.algoliasearch)(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
    console.log("✅ Algolia client initialized");
}
else {
    console.warn("⚠️ Missing Algolia credentials — Algolia sync disabled.");
}
// ─────────────────────────────
// 🔢 Helper
// ─────────────────────────────
function inc(docPath, field, delta) {
    return db.doc(docPath).set({ [field]: firestore_2.FieldValue.increment(delta) }, { merge: true });
}
/* ────────────────────────────────────────────────────────────────
   FOLLOWERS
──────────────────────────────────────────────────────────────── */
exports.onFollowerCreated = (0, firestore_1.onDocumentCreated)("authors/{authorId}/followers/{followerId}", async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "followersCount", 1);
});
exports.onFollowerDeleted = (0, firestore_1.onDocumentDeleted)("authors/{authorId}/followers/{followerId}", async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "followersCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   FOLLOWING
──────────────────────────────────────────────────────────────── */
exports.onFollowingCreated = (0, firestore_1.onDocumentCreated)("authors/{userId}/following/{followedAuthorId}", async (event) => {
    const { userId } = event.params;
    await inc(`authors/${userId}`, "followingCount", 1);
});
exports.onFollowingDeleted = (0, firestore_1.onDocumentDeleted)("authors/{userId}/following/{followedAuthorId}", async (event) => {
    const { userId } = event.params;
    await inc(`authors/${userId}`, "followingCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   BOOKS
──────────────────────────────────────────────────────────────── */
exports.onBookCreated = (0, firestore_1.onDocumentCreated)("books/{bookId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const authorId = snap.data()?.authorId;
    if (authorId)
        await inc(`authors/${authorId}`, "booksCount", 1);
});
exports.onBookDeleted = (0, firestore_1.onDocumentDeleted)("books/{bookId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const authorId = snap.data()?.authorId;
    if (authorId)
        await inc(`authors/${authorId}`, "booksCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   LIKES
──────────────────────────────────────────────────────────────── */
exports.onPostLikeCreated = (0, firestore_1.onDocumentCreated)("posts/{postId}/likes/{userId}", async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "likesCount", 1);
});
exports.onPostLikeDeleted = (0, firestore_1.onDocumentDeleted)("posts/{postId}/likes/{userId}", async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "likesCount", -1);
});
exports.onBookLikeCreated = (0, firestore_1.onDocumentCreated)("books/{bookId}/likes/{userId}", async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "likesCount", 1);
});
exports.onBookLikeDeleted = (0, firestore_1.onDocumentDeleted)("books/{bookId}/likes/{userId}", async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "likesCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   COMMENTS
──────────────────────────────────────────────────────────────── */
exports.onPostCommentCreated = (0, firestore_1.onDocumentCreated)("posts/{postId}/comments/{commentId}", async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "commentsCount", 1);
});
exports.onPostCommentDeleted = (0, firestore_1.onDocumentDeleted)("posts/{postId}/comments/{commentId}", async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "commentsCount", -1);
});
exports.onBookCommentCreated = (0, firestore_1.onDocumentCreated)("books/{bookId}/comments/{commentId}", async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "commentsCount", 1);
});
exports.onBookCommentDeleted = (0, firestore_1.onDocumentDeleted)("books/{bookId}/comments/{commentId}", async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "commentsCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   ANNOUNCEMENTS
──────────────────────────────────────────────────────────────── */
exports.onAnnouncementCreated = (0, firestore_1.onDocumentCreated)("authors/{authorId}/announcements/{announcementId}", async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "announcementsCount", 1);
});
exports.onAnnouncementDeleted = (0, firestore_1.onDocumentDeleted)("authors/{authorId}/announcements/{announcementId}", async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "announcementsCount", -1);
});
/* ────────────────────────────────────────────────────────────────
   TRENDING + CLEANUP
──────────────────────────────────────────────────────────────── */
const WINDOW_HOURS = 24;
const AGGREGATION_SCHEDULE = "0 1 * * *"; // daily 1 AM
const CLEANUP_SCHEDULE = "15 1 * * *";
const SEARCH_EVENTS_RETENTION_DAYS = 7;
// 1️⃣ Trending Aggregator
exports.aggregateTrendingScore = (0, scheduler_1.onSchedule)(AGGREGATION_SCHEDULE, async () => {
    console.log(`🌅 Running daily trending aggregation (past ${WINDOW_HOURS}h window)...`);
    const now = admin.firestore.Timestamp.now();
    const startTime = new Date(now.toDate().getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    const threshold = admin.firestore.Timestamp.fromDate(startTime);
    const eventsSnap = await db
        .collection("search_events")
        .where("timestamp", ">=", threshold)
        .get();
    console.log(`📊 Found ${eventsSnap.size} recent search events.`);
    const counts = {};
    eventsSnap.forEach((doc) => {
        const q = (doc.data().query || "").toLowerCase().trim();
        if (q)
            counts[q] = (counts[q] || 0) + 1;
    });
    const topQueries = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([term]) => term);
    const batch = db.batch();
    const updated = [];
    for (const queryTerm of topQueries) {
        const bookSnap = await db
            .collection("books")
            .where("slug", "==", queryTerm)
            .limit(1)
            .get();
        bookSnap.forEach((b) => {
            batch.update(b.ref, {
                search_score_24h: counts[queryTerm],
                last_score_update: admin.firestore.FieldValue.serverTimestamp(),
            });
            updated.push(b.id);
        });
    }
    await batch.commit();
    console.log(`✅ Updated ${updated.length} trending books.`);
});
// 2️⃣ Cleanup Function
exports.cleanupOldSearchEvents = (0, scheduler_1.onSchedule)({ schedule: CLEANUP_SCHEDULE }, async () => {
    const retentionDays = SEARCH_EVENTS_RETENTION_DAYS;
    const BATCH_SIZE = 300;
    let totalDeleted = 0;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoff = admin.firestore.Timestamp.fromDate(cutoffDate);
    console.log(`🗑️ [Cleanup] Deleting events older than ${cutoff.toDate().toISOString()}`);
    while (true) {
        const snap = await db
            .collection("search_events")
            .where("timestamp", "<", cutoff)
            .orderBy("timestamp", "asc")
            .limit(BATCH_SIZE)
            .get();
        if (snap.empty)
            break;
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += snap.size;
        console.log(`[Cleanup] Deleted ${snap.size}, total ${totalDeleted}...`);
        await new Promise((r) => setTimeout(r, 50));
    }
    console.log(`[Cleanup] ✅ Done. Total deleted: ${totalDeleted}`);
});
// 3️⃣ Trending Pool Updater
exports.refreshTrendingPool = (0, scheduler_1.onSchedule)("30 1 * * *", async () => {
    console.log("🌍 Updating global trending pool for all clubs...");
    const trendingSnap = await db
        .collection("books")
        .orderBy("search_score_24h", "desc")
        .limit(10)
        .get();
    const trendingSlugs = trendingSnap.docs.map((d) => d.id);
    console.log(`🔥 Top trending slugs: ${trendingSlugs.join(", ")}`);
    const clubsSnap = await db.collection("clubs").get();
    const updates = clubsSnap.docs.map((club) => club.ref.update({
        trendingPool: trendingSlugs,
        lastTrendingUpdate: admin.firestore.FieldValue.serverTimestamp(),
    }));
    await Promise.all(updates);
    console.log(`✅ Updated ${updates.length} clubs with trendingPool.`);
});
/* ────────────────────────────────────────────────────────────────
   4️⃣ Real-Time Algolia Sync (unchanged logic)
──────────────────────────────────────────────────────────────── */
function normalizeBook(id, data) {
    return {
        objectID: id,
        title: data.title || "Untitled",
        authorName: data.authorName || "",
        authors: [data.authorName].filter(Boolean),
        cover: data.coverUrl || null,
        slug: data.slug || id,
        description: data.description || "",
        genres: data.genres || [],
        source: "firestore",
    };
}
exports.onBookWrite = (0, firestore_1.onDocumentWritten)("books/{bookId}", async (event) => {
    if (!algoliaClient) {
        console.warn("⚠️ Algolia client not initialized. Skipping sync.");
        return;
    }
    const bookId = event.params.bookId;
    try {
        if (!event.data?.after.exists) {
            await algoliaClient.deleteObject({
                indexName: ALGOLIA_INDEX_NAME,
                objectID: bookId,
            });
            console.log(`🗑️ Removed ${bookId} from Algolia`);
            return;
        }
        const data = event.data.after.data();
        if (!data) {
            console.warn(`⚠️ No data found for ${bookId}`);
            return;
        }
        const record = normalizeBook(bookId, data);
        await algoliaClient.saveObject({
            indexName: ALGOLIA_INDEX_NAME,
            body: record,
        });
        console.log(`✅ Synced ${bookId} to Algolia`);
    }
    catch (err) {
        console.error(`❌ Algolia sync failed for ${bookId}:`, err);
    }
});
