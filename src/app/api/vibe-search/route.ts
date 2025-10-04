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

async function embedQuery(q: string){
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const r = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'authorization': 'Bearer '+key, 'content-type': 'application/json' },
    body: JSON.stringify({ input: q, model: 'text-embedding-3-large' })
  });
  const j = await r.json();
  const v = j?.data?.[0]?.embedding;
  if (!v) throw new Error('embedding failed');
  return v as number[];
}

function cosine(a:number[], b:number[]){
  let dot=0, na=0, nb=0;
  for (let i=0;i<Math.min(a.length,b.length);i++){ dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (na===0 || nb===0) return 0;
  return dot / (Math.sqrt(na)*Math.sqrt(nb));
}

export async function GET(req: NextRequest){
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10) || 20, 50);
    if (!q) return new Response(JSON.stringify({ error: 'Missing q' }), { status: 400 });

    const vec = await embedQuery(q);

    const adminSDK = initAdmin();
    // naive: fetch candidates (you can filter by genre/mood later)
    const snap = await adminSDK.firestore().collection('books').limit(1000).get();
    const results: any[] = [];
    snap.forEach(d => {
      const data = d.data() as any;
      const emb = data.embedding as number[] | undefined;
      if (emb && Array.isArray(emb)){
        const score = cosine(vec, emb);
        results.push({ bookId: d.id, title: data.title, coverUrl: data.coverUrl || null, score });
      }
    });
    results.sort((a,b)=> b.score - a.score);
    return new Response(JSON.stringify({ query: q, results: results.slice(0, limit) }), { headers: { 'content-type':'application/json' } });
  } catch (e:any){
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'content-type':'application/json' } });
  }
}

/*
PGVECTOR OPTION (future):
- Store vectors in Postgres with pgvector (column 'embedding vector(3072)').
- Query: SELECT id, title, cover_url, 1 - (embedding <=> $1) AS score FROM books ORDER BY embedding <=> $1 LIMIT 20;
- Use an environment var PGVECTOR_URL and a server-side client (e.g., 'pg') to connect.
*/
