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
exports.decayTrendingScores = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Initialize Admin SDK (safe for hot reloads)
try {
    admin.app();
}
catch {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * ⏳ Scheduled Function
 * Runs every 24 hours to decay book trending scores.
 */
exports.decayTrendingScores = (0, scheduler_1.onSchedule)({
    schedule: 'every 24 hours',
    timeZone: 'America/New_York',
    memory: '256MiB',
    maxInstances: 1,
}, async () => {
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
    }
    catch (err) {
        logger.error('⚠️ Failed to decay trending scores', err);
    }
});
