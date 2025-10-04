import { NextRequest } from "next/server";

const ALLOW_LOCAL = true;
const BLOCKED_IPS = new Set([
  "0.0.0.0",
  "127.0.0.2", // example — add more if needed
]);

export async function checkIp(req: NextRequest) {
  // Try multiple ways to get IP
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0] : null) ||
    (req as any).ip ||
    "unknown";

  // Local dev bypass
  if (ALLOW_LOCAL && (ip === "127.0.0.1" || ip === "::1")) {
    return { allowed: true, ip, reason: "local_dev" };
  }

  if (BLOCKED_IPS.has(ip)) {
    return { allowed: false, ip, reason: "blocked_ip" };
  }

  // Could later extend this to use Firestore or KV to track banned IPs
  return { allowed: true, ip };
}
