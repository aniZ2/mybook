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
    const kind = url.searchParams.get('kind'); // dry_run | write_books | any
    const limit = Number(url.searchParams.get('limit') || 100);
    const since = url.searchParams.get('since'); // ISO
    const until = url.searchParams.get('until');

    let ref: FirebaseFirestore.Query = adminSDK.firestore().collection('admin_audit').orderBy('at', 'desc');
    if (kind) ref = ref.where('kind', '==', kind);
    if (since) ref = ref.where('at', '>=', admin.firestore.Timestamp.fromDate(new Date(since)));
    if (until) ref = ref.where('at', '<=', admin.firestore.Timestamp.fromDate(new Date(until)));
    const snap = await ref.limit(limit).get();

    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return new Response(JSON.stringify({ rows }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
