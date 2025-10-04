// src/lib/rateLimit.ts
import { NextRequest } from 'next/server';

type RateLimitResult = {
  ok: boolean;
  resetAt?: number;
};

// In-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export async function checkRateLimit(
  req: NextRequest,
  identifier: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
  const key = `${identifier}:${ip}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const current = rateLimitStore.get(key);

  // If no entry or window expired, create new entry
  if (!current || now > current.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { ok: true };
  }

  // Check if limit exceeded
  if (current.count >= maxRequests) {
    return {
      ok: false,
      resetAt: current.resetAt,
    };
  }

  // Increment count
  current.count++;
  return { ok: true };
}