import { NextRequest } from 'next/server';
export async function POST(req: NextRequest){
  // Call your callable function issueARC here via REST/Firebase SDK in production
  return new Response(JSON.stringify({ url: 'https://example.com/signed-arc-url' }), { headers: { 'content-type':'application/json' } });
}
