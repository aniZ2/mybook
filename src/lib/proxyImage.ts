/**
 * Ensures a safe image URL by routing external sources through /api/proxy
 */
export function getSafeImageUrl(originalUrl?: string | null): string {
  if (!originalUrl) return "/placeholder.png";

  try {
    const parsed = new URL(originalUrl);

    // If already from Firebase Storage, Cloudflare, or your own CDN → return as-is
    if (
      parsed.hostname.includes("firebasestorage.googleapis.com") ||
      parsed.hostname.includes("cloudflareimages") ||
      parsed.hostname.includes("booklyverse")
    ) {
      return originalUrl;
    }

    // Otherwise, proxy through API route
    return `/api/proxy?url=${encodeURIComponent(originalUrl)}`;
  } catch {
    return "/placeholder.png";
  }
}
