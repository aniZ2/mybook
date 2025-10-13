import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth"; // Add this import

/**
 * Recursively serialize Firestore/Admin Timestamp fields to ISO strings
 */
function serialize(data: any): any {
  if (data === null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map((v) => serialize(v));

  const out: any = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === undefined) continue;
    if (val && typeof val === "object") {
      if (typeof (val as any).toDate === "function") {
        try {
          out[key] = (val as any).toDate().toISOString();
        } catch (err) {
          console.warn(`⚠️ Failed to serialize Timestamp for ${key}:`, err);
          out[key] = null;
        }
      } else {
        out[key] = serialize(val);
      }
    } else {
      out[key] = val;
    }
  }
  return out;
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  console.log("📡 CLUB API REQUEST:", slug);

  try {
    console.log("🧩 Admin SDK check:", !!dbAdmin);

    if (!dbAdmin) {
      console.error("🔥 dbAdmin is null — Admin SDK not initialized.");
      return NextResponse.json({ success: false, error: "Admin SDK missing" }, { status: 500 });
    }

    // ✅ Get current user from Authorization header
    let currentUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
        console.log("👤 Authenticated user:", currentUserId);
      } catch (err) {
        console.warn("⚠️ Invalid auth token:", err);
      }
    }

    const clubRef = dbAdmin.collection("clubs").doc(slug);
    const clubSnap = await clubRef.get();
    console.log("📄 clubSnap.exists:", clubSnap.exists);

    if (!clubSnap.exists) {
      return NextResponse.json({ success: false, error: "Club not found" }, { status: 404 });
    }

    const clubData = clubSnap.data();
    console.log("✅ CLUB DATA:", clubData ? Object.keys(clubData) : "No data");

    // Fetch all collections in parallel
    const [booksSnap, membersSnap, postsSnap, eventsSnap, announcementsSnap] = await Promise.all([
      clubRef.collection("books").limit(12).get(),
      clubRef.collection("members").limit(12).get(),
      clubRef.collection("posts").orderBy("createdAt", "desc").limit(20).get(),
      clubRef.collection("events").where("date", ">=", new Date().toISOString()).orderBy("date", "asc").limit(5).get(),
      clubRef.collection("announcements").orderBy("date", "desc").limit(5).get(),
    ]);

    console.log(
      "📚 books:", booksSnap.size,
      "👥 members:", membersSnap.size,
      "📰 posts:", postsSnap.size,
      "📅 events:", eventsSnap.size,
      "📢 announcements:", announcementsSnap.size
    );

    // ✅ Process posts with upvote status
    const posts = postsSnap.docs.map((d) => {
      const postData = d.data();
      const upvotedBy = postData.upvotedBy || [];
      return {
        id: d.id,
        slug: d.id, // Use document ID as slug
        clubSlug: slug, // Add club slug
        ...serialize(postData),
        hasUpvoted: currentUserId ? upvotedBy.includes(currentUserId) : false,
      };
    });

    // ✅ APPLY SERIALIZATION HERE
    return NextResponse.json(
      {
        success: true,
        club: serialize(clubData),
        books: booksSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
        members: membersSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
        posts, // Use the processed posts
        events: eventsSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
        announcements: announcementsSnap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) })),
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("🔥 API ERROR:", message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}