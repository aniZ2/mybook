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

import { checkIp } from '@/lib/ipGuard';

export async function POST(req: NextRequest){
  const ip = await checkIp(req as any);
  if (!ip.allowed) return new Response(JSON.stringify({ error: ip.reason||'forbidden' }), { status: 403 });
  const rl = await checkRateLimit(req as any, 'generic_post', 30, 60);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  try {
    const adminSDK = initAdmin();
    const body = await req.json();
    const auth = req.headers.get('authorization') || '';
    let uid: string | null = null;
    if (auth.startsWith('Bearer ')){
      try {
        const decoded = await adminSDK.auth().verifyIdToken(auth.slice(7));
        uid = decoded.uid;
      } catch {}
    }
    const payload = {
      at: admin.firestore.FieldValue.serverTimestamp(),
      uid,
      kind: body.kind || 'dry_run',
      context: body.context || {},
      rows: body.rows || [],
      note: body.note || null
    };
    await adminSDK.firestore().collection('admin_audit').doc().set(payload);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
