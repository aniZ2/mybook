import { NextRequest } from 'next/server';
import admin from 'firebase-admin';

function initAdmin(){
  if (admin.apps.length === 0){
    const svc = process.env.SERVICE_ACCOUNT_JSON;
    if (!svc) throw new Error('SERVICE_ACCOUNT_JSON not set');
    const json = JSON.parse(svc);
    admin.initializeApp({
      credential: admin.credential.cert(json)
    });
  }
  return admin;
}

// body: { seriesId, books: [{ bookId, index }] }
export async function POST(req: NextRequest){
  const body = await req.json();
  const seriesId = body.seriesId;
  const books = (body.books || []).slice().sort((a:any,b:any)=> (a.index ?? 0) - (b.index ?? 0));
  const nextMap: Record<string, string|null> = {};
  for (let i=0;i<books.length;i++){
    const current = books[i]; const next = books[i+1];
    nextMap[current.bookId] = next ? next.bookId : null;
  }

  try {
    const adminSDK = initAdmin();
    await adminSDK.firestore().collection('series').doc(seriesId).set({ nextMap }, { merge: true });
    return new Response(JSON.stringify({ ok: true, nextMap }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}
