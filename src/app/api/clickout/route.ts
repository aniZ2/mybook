import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const deal = url.searchParams.get('deal') || 'unknown';
  // TODO: increment click metrics in Firestore (requires Admin SDK via Functions or REST with callable)
  return NextResponse.redirect('https://www.amazon.com/', { status: 302 });
}
