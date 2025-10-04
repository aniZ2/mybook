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
    if (!token) return new Response('Unauthorized', { status: 401 });
    const decoded = await adminSDK.auth().verifyIdToken(token);
    if (!decoded.admin) return new Response('Forbidden', { status: 403 });
    const url = new URL(req.url);
    const path = url.searchParams.get('path')!;
    const snap = await adminSDK.firestore().doc(path).get();
    return new Response(JSON.stringify({ doc: snap.exists ? snap.data() : null }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
