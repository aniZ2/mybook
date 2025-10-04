// src/lib/sentry.ts
import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry safely so it doesn’t break local or build environments
 */
if (!Sentry.isInitialized && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || "development",
  });
}

/**
 * Capture an error and log to console (safe in both dev and prod)
 */
export function captureError(error: unknown, context?: any) {
  try {
    Sentry.captureException(error, { extra: context });
  } catch (err) {
    console.error("Sentry capture failed:", err);
  } finally {
    if (process.env.NODE_ENV !== "production") {
      console.error("[Error]", error);
    }
  }
}

export default Sentry;
