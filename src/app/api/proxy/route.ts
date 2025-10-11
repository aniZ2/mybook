import { NextRequest, NextResponse } from "next/server";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import crypto from "crypto";
import sharp from "sharp";
import { app } from "@/lib/firebase";

export const runtime = "nodejs";        // ✅ Required for sharp + crypto
export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2 MB limit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const TARGET_WIDTH = 400;
const QUALITY = 80;

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) return NextResponse.json({ error: "Missing ?url" }, { status: 400 });

    // 🛡️ Enforce same-origin / internal use only
    const referer = req.headers.get("referer") || "";
    const allowedHost = process.env.NEXT_PUBLIC_SITE_URL || "booklyverse";
    if (!referer.includes(allowedHost)) {
      console.warn("⚠️ Unauthorized referer:", referer);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate URL protocol
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    // Generate deterministic cache key
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 24);
    const filePath = `proxy/${hash}.webp`;

    const db = getFirestore(app);
    const storage = getStorage(app);

    // 🔁 Reuse cached file if already uploaded
    const q = query(collection(db, "proxyCache"), where("hash", "==", hash));
    const existing = await getDocs(q);
    if (!existing.empty) {
      const doc = existing.docs[0].data();
      return NextResponse.json(
        { url: doc.downloadUrl },
        {
          headers: {
            "Cache-Control": "public, max-age=31536000, immutable", // 1 year
          },
        }
      );
    }

    // 🌐 Fetch the external image
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json({ error: "Fetch failed" }, { status: 400 });
    }

    const contentType = res.headers.get("content-type") || "";
    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);

    // Validate file type and size
    if (!ALLOWED_TYPES.some((t) => contentType.startsWith(t))) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }
    if (contentLength > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    // 💾 Read + optimize
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(buffer)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .toFormat("webp", { quality: QUALITY })
      .toBuffer();

    // ☁️ Upload to Firebase Storage
    const storageRef = ref(storage, filePath);
    await uploadBytes(storageRef, optimized, { contentType: "image/webp" });
    const downloadUrl = await getDownloadURL(storageRef);

    // 🧩 Store cache record in Firestore
    await addDoc(collection(db, "proxyCache"), {
      url,
      hash,
      downloadUrl,
      originalSize: contentLength,
      optimizedSize: optimized.byteLength,
      createdAt: Date.now(),
    });

    return NextResponse.json(
      { url: downloadUrl },
      {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable", // Cache the response
        },
      }
    );
  } catch (err: any) {
    console.error("🔥 Proxy error:", err);
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 });
  }
}
