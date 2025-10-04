import { NextRequest } from 'next/server';

export async function GET(req: NextRequest){
  const url = new URL(req.url);
  const bookId = url.searchParams.get('bookId') || '';
  // Stub: In production, fetch series doc containing nextMap[bookId]
  return new Response(JSON.stringify({ next: null, note: 'Implement lookup using series.nextMap' }), { headers: { 'content-type':'application/json' } });
}
