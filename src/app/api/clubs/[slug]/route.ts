import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

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

// ✅ Next.js 15 fix: `params` is a Promise, so we await it before reading slug
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  console.log("📡 CLUB API REQUEST:", slug);

  try {
    if (!dbAdmin) {
      console.error("🔥 dbAdmin is null — Admin SDK not initialized.");
      return NextResponse.json(
        { success: false, error: "Admin SDK missing" },
        { status: 500 }
      );
    }

    // ✅ Verify user (optional)
    let currentUserId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const token = authHeader.substring(7);
        const decodedToken = await getAuth().verifyIdToken(token);
        currentUserId = decodedToken.uid;
      } catch (err) {
        console.warn("⚠️ Invalid auth token:", err);
      }
    }

    const clubRef = dbAdmin.collection("clubs").doc(slug);
    const clubSnap = await clubRef.get();
    if (!clubSnap.exists) {
      return NextResponse.json(
        { success: false, error: "Club not found" },
        { status: 404 }
      );
    }

    const clubData = clubSnap.data() || {};
    const roundActive = clubData.roundActive ?? false;
    const nextCandidates = clubData.nextCandidates ?? [];

    // ─────────── Fetch related subcollections
    const [
      booksSnap,
      membersSnap,
      postsSnap,
      eventsSnap,
      announcementsSnap,
      votesSnap,
    ] = await Promise.all([
      clubRef.collection("books").limit(12).get(),
      clubRef.collection("members").limit(12).get(),
      clubRef.collection("posts")
        .orderBy("createdAt", "desc")
        .limit(20)
        .get(),
      clubRef
        .collection("events")
        .where("date", ">=", new Date().toISOString())
        .orderBy("date", "asc")
        .limit(5)
        .get(),
      clubRef.collection("announcements").orderBy("date", "desc").limit(5).get(),
      dbAdmin.collection(`clubs/${slug}/votes`).get(), // ✅ voting subcollection
    ]);

    // ─────────── Map votes into a dictionary
    const votes: Record<string, number> = {};
    votesSnap.forEach((doc) => {
      const d = doc.data();
      votes[doc.id] = d.voteCount || 0;
    });

    // ─────────── Map posts with upvote status
    const posts = postsSnap.docs.map((d) => {
      const data = d.data();
      const upvotedBy = data.upvotedBy || [];
      return {
        id: d.id,
        slug: d.id,
        clubSlug: slug,
        ...serialize(data),
        hasUpvoted: currentUserId ? upvotedBy.includes(currentUserId) : false,
      };
    });

    // ─────────── Build response
    return NextResponse.json(
      {
        success: true,
        club: serialize(clubData),
        roundActive,
        nextCandidates,
        votes,
        books: booksSnap.docs.map((d) => ({
          id: d.id,
          ...serialize(d.data()),
        })),
        members: membersSnap.docs.map((d) => ({
          id: d.id,
          ...serialize(d.data()),
        })),
        posts,
        events: eventsSnap.docs.map((d) => ({
          id: d.id,
          ...serialize(d.data()),
        })),
        announcements: announcementsSnap.docs.map((d) => ({
          id: d.id,
          ...serialize(d.data()),
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("🔥 API ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
