import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { checkRateLimit } from '@/lib/rateLimit';

function initAdmin(){
  if (admin.apps.length === 0){
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

// body: { path: 'collection/docId', reason: string, snapshot?: any, evidenceUrls?: string[] }
export async function POST(req: NextRequest){
  const rl = await checkRateLimit(req as any, 'mod_report', 10, 300);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  try {
    const adminSDK = initAdmin();
    const body = await req.json();
    const auth = req.headers.get('authorization') || '';
    let uid: string | null = null;
    if (auth.startsWith('Bearer ')){
      try { uid = (await adminSDK.auth().verifyIdToken(auth.slice(7))).uid; } catch {}
    }
    const item = {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: uid || null,
      path: body.path || null,
      reason: body.reason || 'report',
      snapshot: body.snapshot || null,
      evidenceUrls: body.evidenceUrls || [],
      resolved: false
    };
    const ref = await adminSDK.firestore().collection('moderation').doc('queue').collection('items').add(item);
    return new Response(JSON.stringify({ ok:true, id: ref.id }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
