import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';

// Initialize Admin SDK (safe for hot reloads)
try {
  admin.app();
} catch {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * ⏳ Scheduled Function
 * Runs every 24 hours to decay book trending scores.
 */
export const decayTrendingScores = onSchedule(
  {
    schedule: 'every 24 hours',
    timeZone: 'America/New_York',
    memory: '256MiB',
    maxInstances: 1,
  },
  async () => {
    const batchSize = 400;
    const decayRate = 0.9; // 10% daily decay
    const minThreshold = 0.5;

    logger.info('🔥 Running trending score decay...');

    try {
      const snap = await db
        .collection('books')
        .where('trendingScore', '>', minThreshold)
        .limit(batchSize)
        .get();

      if (snap.empty) {
        logger.info('No books found above threshold.');
        return;
      }

      const batch = db.batch();

      snap.docs.forEach((docu) => {
        const data = docu.data();
        const current = data.trendingScore ?? 0;
        const decayed = Math.max(current * decayRate, 0);
        batch.update(docu.ref, { trendingScore: decayed });
      });

      await batch.commit();
      logger.info(`✅ Successfully decayed ${snap.size} books.`);
    } catch (err) {
      logger.error('⚠️ Failed to decay trending scores', err);
    }
  }
);
