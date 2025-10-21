import { 
  onDocumentCreated, 
  onDocumentDeleted, 
  onDocumentWritten 
} from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2/options";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { algoliasearch } from "algoliasearch";

// ─────────────────────────────
// ⚙️ Global Options
// ─────────────────────────────
setGlobalOptions({
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

let algoliaClient: ReturnType<typeof algoliasearch> | null = null;

if (ALGOLIA_APP_ID && ALGOLIA_ADMIN_KEY) {
  algoliaClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
  console.log("✅ Algolia client initialized");
} else {
  console.warn("⚠️ Missing Algolia credentials — Algolia sync disabled.");
}

// ─────────────────────────────
// 🔢 Helper
// ─────────────────────────────
function inc(docPath: string, field: string, delta: number) {
  return db.doc(docPath).set({ [field]: FieldValue.increment(delta) }, { merge: true });
}

/* ────────────────────────────────────────────────────────────────
   FOLLOWERS
──────────────────────────────────────────────────────────────── */
export const onFollowerCreated = onDocumentCreated(
  "authors/{authorId}/followers/{followerId}",
  async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "followersCount", 1);
  }
);

export const onFollowerDeleted = onDocumentDeleted(
  "authors/{authorId}/followers/{followerId}",
  async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "followersCount", -1);
  }
);

/* ────────────────────────────────────────────────────────────────
   FOLLOWING
──────────────────────────────────────────────────────────────── */
export const onFollowingCreated = onDocumentCreated(
  "authors/{userId}/following/{followedAuthorId}",
  async (event) => {
    const { userId } = event.params;
    await inc(`authors/${userId}`, "followingCount", 1);
  }
);

export const onFollowingDeleted = onDocumentDeleted(
  "authors/{userId}/following/{followedAuthorId}",
  async (event) => {
    const { userId } = event.params;
    await inc(`authors/${userId}`, "followingCount", -1);
  }
);

/* ────────────────────────────────────────────────────────────────
   BOOKS
──────────────────────────────────────────────────────────────── */
export const onBookCreated = onDocumentCreated("books/{bookId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const authorId = (snap.data() as any)?.authorId as string | undefined;
  if (authorId) await inc(`authors/${authorId}`, "booksCount", 1);
});

export const onBookDeleted = onDocumentDeleted("books/{bookId}", async (event) => {
  const snap = event.data;
  if (!snap) return;
  const authorId = (snap.data() as any)?.authorId as string | undefined;
  if (authorId) await inc(`authors/${authorId}`, "booksCount", -1);
});

/* ────────────────────────────────────────────────────────────────
   LIKES
──────────────────────────────────────────────────────────────── */
export const onPostLikeCreated = onDocumentCreated(
  "posts/{postId}/likes/{userId}",
  async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "likesCount", 1);
  }
);

export const onPostLikeDeleted = onDocumentDeleted(
  "posts/{postId}/likes/{userId}",
  async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "likesCount", -1);
  }
);

export const onBookLikeCreated = onDocumentCreated(
  "books/{bookId}/likes/{userId}",
  async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "likesCount", 1);
  }
);

export const onBookLikeDeleted = onDocumentDeleted(
  "books/{bookId}/likes/{userId}",
  async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "likesCount", -1);
  }
);

/* ────────────────────────────────────────────────────────────────
   COMMENTS
──────────────────────────────────────────────────────────────── */
export const onPostCommentCreated = onDocumentCreated(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "commentsCount", 1);
  }
);

export const onPostCommentDeleted = onDocumentDeleted(
  "posts/{postId}/comments/{commentId}",
  async (event) => {
    const { postId } = event.params;
    await inc(`posts/${postId}`, "commentsCount", -1);
  }
);

export const onBookCommentCreated = onDocumentCreated(
  "books/{bookId}/comments/{commentId}",
  async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "commentsCount", 1);
  }
);

export const onBookCommentDeleted = onDocumentDeleted(
  "books/{bookId}/comments/{commentId}",
  async (event) => {
    const { bookId } = event.params;
    await inc(`books/${bookId}`, "commentsCount", -1);
  }
);

/* ────────────────────────────────────────────────────────────────
   ANNOUNCEMENTS
──────────────────────────────────────────────────────────────── */
export const onAnnouncementCreated = onDocumentCreated(
  "authors/{authorId}/announcements/{announcementId}",
  async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "announcementsCount", 1);
  }
);

export const onAnnouncementDeleted = onDocumentDeleted(
  "authors/{authorId}/announcements/{announcementId}",
  async (event) => {
    const { authorId } = event.params;
    await inc(`authors/${authorId}`, "announcementsCount", -1);
  }
);

/* ────────────────────────────────────────────────────────────────
   TRENDING + CLEANUP
──────────────────────────────────────────────────────────────── */
const WINDOW_HOURS = 24;
const AGGREGATION_SCHEDULE = "0 1 * * *"; // daily 1 AM
const CLEANUP_SCHEDULE = "15 1 * * *";
const SEARCH_EVENTS_RETENTION_DAYS = 7;

// 1️⃣ Trending Aggregator
export const aggregateTrendingScore = onSchedule(
  AGGREGATION_SCHEDULE,
  async (): Promise<void> => {
    console.log(`🌅 Running daily trending aggregation (past ${WINDOW_HOURS}h window)...`);

    const now = admin.firestore.Timestamp.now();
    const startTime = new Date(now.toDate().getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    const threshold = admin.firestore.Timestamp.fromDate(startTime);

    const eventsSnap = await db
      .collection("search_events")
      .where("timestamp", ">=", threshold)
      .get();

    console.log(`📊 Found ${eventsSnap.size} recent search events.`);

    const counts: Record<string, number> = {};
    eventsSnap.forEach((doc) => {
      const q = (doc.data().query || "").toLowerCase().trim();
      if (q) counts[q] = (counts[q] || 0) + 1;
    });

    const topQueries = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 50)
      .map(([term]) => term);

    const batch = db.batch();
    const updated: string[] = [];

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
  }
);

// 2️⃣ Cleanup Function
export const cleanupOldSearchEvents = onSchedule(
  { schedule: CLEANUP_SCHEDULE },
  async (): Promise<void> => {
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

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      totalDeleted += snap.size;
      console.log(`[Cleanup] Deleted ${snap.size}, total ${totalDeleted}...`);

      await new Promise((r) => setTimeout(r, 50));
    }

    console.log(`[Cleanup] ✅ Done. Total deleted: ${totalDeleted}`);
  }
);

// 3️⃣ Trending Pool Updater
export const refreshTrendingPool = onSchedule("30 1 * * *", async (): Promise<void> => {
  console.log("🌍 Updating global trending pool for all clubs...");

  const trendingSnap = await db
    .collection("books")
    .orderBy("search_score_24h", "desc")
    .limit(10)
    .get();

  const trendingSlugs = trendingSnap.docs.map((d) => d.id);
  console.log(`🔥 Top trending slugs: ${trendingSlugs.join(", ")}`);

  const clubsSnap = await db.collection("clubs").get();
  const updates = clubsSnap.docs.map((club) =>
    club.ref.update({
      trendingPool: trendingSlugs,
      lastTrendingUpdate: admin.firestore.FieldValue.serverTimestamp(),
    })
  );

  await Promise.all(updates);
  console.log(`✅ Updated ${updates.length} clubs with trendingPool.`);
});

/* ────────────────────────────────────────────────────────────────
   4️⃣ Real-Time Algolia Sync (unchanged logic)
──────────────────────────────────────────────────────────────── */
function normalizeBook(id: string, data: admin.firestore.DocumentData) {
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

export const onBookWrite = onDocumentWritten("books/{bookId}", async (event) => {
  if (!algoliaClient) {
    console.warn("⚠️ Algolia client not initialized. Skipping sync.");
    return;
  }

  const bookId = event.params.bookId as string;

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
  } catch (err) {
    console.error(`❌ Algolia sync failed for ${bookId}:`, err);
  }
});
