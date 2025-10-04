import { NextRequest } from 'next/server';
import admin from 'firebase-admin';

function initAdmin(){
  if (admin.apps.length === 0){
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

export async function GET(req: NextRequest){
  try {
    const adminSDK = initAdmin();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 });
    const decoded = await adminSDK.auth().verifyIdToken(token);
    if (!decoded.admin) return new Response(JSON.stringify({ error: 'Not admin' }), { status: 403 });

    const url = new URL(req.url);
    const pageToken = url.searchParams.get('pageToken') || undefined;
    const limit = Number(url.searchParams.get('limit') || 50);
    const res = await adminSDK.auth().listUsers(limit, pageToken);
    // hydrate with Firestore stripeCustomerId
    const enriched = await Promise.all(res.users.map(async u => {
      const doc = await adminSDK.firestore().collection('users').doc(u.uid).get();
      return {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        disabled: u.disabled,
        admin: !!(u.customClaims && (u.customClaims as any).admin),
        stripeCustomerId: doc.exists ? (doc.data() as any).stripeCustomerId || null : null
      };
    }));
    return new Response(JSON.stringify({ users: enriched, nextPageToken: res.pageToken || null }), { headers: { 'content-type': 'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
