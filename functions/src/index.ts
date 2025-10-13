import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue, Firestore } from 'firebase-admin/firestore';
import { onSchedule, ScheduledEvent } from 'firebase-functions/v2/scheduler'; // Import ScheduledEvent
import { setGlobalOptions } from 'firebase-functions/v2/options';
import * as admin from 'firebase-admin';

// ─────────────────────────────
// ⚙️ Global Options (Applies to both functions)
// ─────────────────────────────
setGlobalOptions({
  region: 'us-central1',
  timeoutSeconds: 540,
  memory: '512MiB',
});

// Initialize Admin SDK safely (avoid double init)
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// ─────────────────────────────
// 🕐 Config
// ─────────────────────────────
const WINDOW_HOURS = 24; // calculate trending score over last 24h
const AGGREGATION_SCHEDULE = '0 1 * * *'; // daily at 1:00 AM (server time)
const CLEANUP_SCHEDULE = '15 1 * * *'; // daily at 1:15 AM (server time)
const SEARCH_EVENTS_RETENTION_DAYS = 7;

// ─────────────────────────────
// 1️⃣ Scheduled Aggregator (V2)
// ─────────────────────────────
// ✅ FIX 1: Defined handler with 'event' argument and explicit return type of 'void'
export const aggregateTrendingScore = onSchedule(AGGREGATION_SCHEDULE, async (event: ScheduledEvent): Promise<void> => {
  console.log(`🌅 Running daily trending aggregation (past ${WINDOW_HOURS}h window)...`);

  // Using the firestore namespace from admin for Timestamp/FieldValue
  const now = admin.firestore.Timestamp.now(); 
  const startTime = new Date(now.toDate().getTime() - WINDOW_HOURS * 60 * 60 * 1000);
  const threshold = admin.firestore.Timestamp.fromDate(startTime);

  // 1️⃣ Fetch Search Events from last 24h
  const eventsSnap = await db.collection('search_events')
    .where('timestamp', '>=', threshold)
    .get();

  console.log(`📊 Found ${eventsSnap.size} recent search events.`);

  const counts: Record<string, number> = {};
  eventsSnap.forEach((doc) => {
    const q = (doc.data().query || '').toLowerCase().trim();
    // Use the actual Firestore data field name ('query')
    if (q) counts[q] = (counts[q] || 0) + 1; 
  });

  const topQueries = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 50)
    .map(([term]) => term);

  console.log(`🔥 Aggregating top ${topQueries.length} queries.`);

  // 2️⃣ Update Matching Books
  const batch = db.batch();
  const updated: string[] = [];

  for (const queryTerm of topQueries) {
    // NOTE: This assumes queryTerm (search term) matches the book slug.
    const bookSnap = await db.collection('books')
      .where('slug', '==', queryTerm)
      .limit(1)
      .get();

    bookSnap.forEach((b) => {
      // Use b.ref for the batch update
      batch.update(b.ref, { 
        search_score_24h: counts[queryTerm],
        last_score_update: admin.firestore.FieldValue.serverTimestamp(),
      });
      updated.push(b.id);
    });
  }

  await batch.commit();
  console.log(`✅ Updated ${updated.length} trending books.`);
  // No explicit return statement needed, function implicitly returns Promise<void>
});


// ─────────────────────────────
// 2️⃣ Cleanup Function (V2)
// ─────────────────────────────
// ✅ FIX 2: Defined handler with 'event' argument and explicit return type of 'void'
export const cleanupOldSearchEvents = onSchedule(
  { 
    schedule: CLEANUP_SCHEDULE, 
  }, 
  async (event: ScheduledEvent): Promise<void> => {
    const retentionDays = SEARCH_EVENTS_RETENTION_DAYS;
    const BATCH_SIZE = 300; 
    let totalDeleted = 0;

    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const cutoff = admin.firestore.Timestamp.fromDate(cutoffDate);

    console.log(
      `🗑️ [Cleanup] Starting. Deleting events older than ${cutoff.toDate().toISOString()}`
    );

    while (true) {
      // Query for old events
      const snap = await db
        .collection('search_events')
        .where('timestamp', '<', cutoff)
        .orderBy('timestamp', 'asc')
        .limit(BATCH_SIZE)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();

      totalDeleted += snap.size;
      console.log(`[Cleanup] Deleted ${snap.size}, total ${totalDeleted}...`);

      // Yield a tiny bit to avoid long-running CPU spikes
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log(`[Cleanup] ✅ Done. Total deleted: ${totalDeleted}`);
    // No explicit return statement needed, function implicitly returns Promise<void>
  }
);

// ─────────────────────────────
// 3️⃣ Trending Pool Updater (V2)
// ─────────────────────────────
// Refreshes top trending books and updates every club's trendingPool array
export const refreshTrendingPool = onSchedule("30 1 * * *", async (): Promise<void> => {
  console.log("🌍 Updating global trending pool for all clubs...");

  const db = getFirestore();

  // 1️⃣ Get top 10 books by recent search score
  const trendingSnap = await db
    .collection("books")
    .orderBy("search_score_24h", "desc")
    .limit(10)
    .get();

  const trendingSlugs = trendingSnap.docs.map((d) => d.id);
  console.log(`🔥 Top trending slugs: ${trendingSlugs.join(", ")}`);

  // 2️⃣ Update each club document with this array
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
