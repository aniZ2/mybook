import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { captureError } from '@/lib/sentry';

function initAdmin(){
  if (admin.apps.length === 0){
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({ credential: admin.credential.cert(json) });
  }
  return admin;
}

// body: { action: 'hide_post'|'delete_post'|'ban_user'|'unban_user', target: { path?: string, uid?: string, reportId?: string, note?: string } }
import { checkRateLimit } from '@/lib/rateLimit';

import { checkIp } from '@/lib/ipGuard';

export async function POST(req: NextRequest){
  const ip = await checkIp(req as any);
  if (!ip.allowed) return new Response(JSON.stringify({ error: ip.reason||'forbidden' }), { status: 403 });
  const rl = await checkRateLimit(req as any, 'generic_post', 30, 60);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  const adminSDK = initAdmin();
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 });
    const decoded = await adminSDK.auth().verifyIdToken(token);
    if (!decoded.admin) return new Response(JSON.stringify({ error: 'Not admin' }), { status: 403 });

    const body = await req.json();
    const { action, target } = body;
    const actor = decoded.uid;

    if (action === 'ban_user' && target?.uid){
      await adminSDK.auth().updateUser(target.uid, { disabled: true });
    }
    if (action === 'unban_user' && target?.uid){
      await adminSDK.auth().updateUser(target.uid, { disabled: false });
    }
    if ((action === 'hide_post' || action === 'delete_post') && target?.path){
      const ref = adminSDK.firestore().doc(target.path);
      if (action === 'hide_post'){
        await ref.set({ hidden: true, hiddenAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      } else {
        await ref.delete();
      }
    }
    if (target?.reportId){
      await adminSDK.firestore().collection('moderation').doc('queue').collection('items').doc(target.reportId).set({
        resolved: true, resolvedAt: admin.firestore.FieldValue.serverTimestamp(), action, actor, note: target.note || null
      }, { merge: true });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    captureError(e, { route: 'mod/act' });
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
