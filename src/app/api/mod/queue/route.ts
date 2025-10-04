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

import { checkRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest){
  try {
    const adminSDK = initAdmin();
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 });
    const decoded = await adminSDK.auth().verifyIdToken(token);
    if (!decoded.admin) return new Response(JSON.stringify({ error: 'Not admin' }), { status: 403 });

    const snap = await adminSDK.firestore().collection('moderation').doc('queue').collection('items').orderBy('createdAt','desc').limit(200).get();
    const items = snap.docs.map(d=>({ id: d.id, ...d.data() }));
    return new Response(JSON.stringify({ items }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
