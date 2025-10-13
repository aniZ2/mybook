import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  try {
    const db = getAdminDb();
    const trendingSnap = await db
      .collection("books")
      .orderBy("voteScore", "desc")
      .limit(10)
      .get();

    const nominations = trendingSnap.docs.map((d) => ({
      slug: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ nominations });
  } catch (err) {
    console.error("🔥 trending fetch error:", err);
    return NextResponse.json({ error: "Failed to load trending books" }, { status: 500 });
  }
}
