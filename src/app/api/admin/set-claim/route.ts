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

// Body: { uid, admin: boolean }
// Header: x-admin-key: <ADMIN_API_KEY>
export async function POST(req: NextRequest){
  try {
    const key = req.headers.get('x-admin-key');
    if (key !== process.env.ADMIN_API_KEY) return new Response('Forbidden', { status: 403 });
    const adminSDK = initAdmin();
    const body = await req.json();
    const uid = body.uid as string;
    const isAdmin = !!body.admin;
    await adminSDK.auth().setCustomUserClaims(uid, { admin: isAdmin });
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
