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

export async function POST(req: NextRequest){
  const rl = await checkRateLimit(req as any, 'generic_post', 30, 60);
  if (!rl.ok) return new Response(JSON.stringify({ error:'rate_limited', resetAt: rl.resetAt }), { status: 429 });
  const adminSDK = initAdmin();
  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return new Response('Unauthorized', { status: 401 });
    const decoded = await adminSDK.auth().verifyIdToken(token);
    if (!decoded.admin) return new Response('Forbidden', { status: 403 });

    const body = await req.json();
    const { collections = [], format = 'csv', limit = 5000 } = body as any;

    const results: Record<string, string> = {};
    for (const col of collections){
      const snap = await adminSDK.firestore().collection(col).limit(limit).get();
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (format === 'ndjson'){
        results[col] = docs.map(d=>JSON.stringify(d)).join('\n');
      } else {
        const headers = Object.keys(docs.reduce((acc,cur)=>{ Object.keys(cur).forEach(k=>acc[k]=1); return acc; }, {} as any));
        const esc = (v:any)=> '"'+String(v ?? '').replace(/"/g,'""')+'"';
        const rows = [headers.join(',')];
        for (const d of docs){
          rows.push(headers.map(h=>esc((d as any)[h])).join(','));
        }
        results[col] = rows.join('\n');
      }
    }

    return new Response(JSON.stringify({ format, results }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
