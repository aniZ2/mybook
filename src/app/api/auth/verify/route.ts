export const dynamic = 'force-dynamic'

import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const sessionCookie = (await cookies()).get("__session")?.value;
    if (!sessionCookie)
      return Response.json({ authenticated: false }, { status: 401 });

    // getAuth() without arguments uses the default app
    const decoded = await getAuth().verifySessionCookie(sessionCookie, true);
    return Response.json({ authenticated: true, uid: decoded.uid });
  } catch (error) {
    console.warn("Session check failed:", error);
    return Response.json({ authenticated: false }, { status: 401 });
  }
}