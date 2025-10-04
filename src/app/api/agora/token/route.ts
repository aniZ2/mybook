// app/api/agora/token/route.ts
import { NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get('channel') || 'demo';
  const uid = Number(searchParams.get('uid') || 0); // 0 for dynamic
  const expireSeconds = 60 * 60; // 1 hour

  const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID;
  const APP_CERT = process.env.AGORA_APP_CERTIFICATE; // keep this server-only!

  if (!APP_ID || !APP_CERT) {
    return NextResponse.json({ error: 'Agora not configured' }, { status: 501 });
  }

  const role = RtcRole.PUBLISHER;
  const privilegeExpireTs = Math.floor(Date.now() / 1000) + expireSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERT,
    channelName,
    uid,
    role,
    privilegeExpireTs
  );

  return NextResponse.json({ token, appId: APP_ID, channel: channelName, uid });
}
