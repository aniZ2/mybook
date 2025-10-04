import { NextRequest } from 'next/server';
export async function POST(req: NextRequest){
  const body = await req.text(); // accept any
  return new Response(JSON.stringify({ ok: true, received: body }), { headers: { 'content-type':'application/json' } });
}
