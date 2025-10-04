'use client';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

const { default: AgoraRTC } = require('agora-rtc-sdk-ng');

export default function RoomPage(){
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const localRef = useRef<HTMLDivElement>(null);
  const remoteRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    return () => { /* cleanup on unmount if needed */ };
  },[]);

  const join = async () => {
    try {
      const channel = typeof window !== 'undefined' ? location.pathname.split('/').pop() : 'demo';
      const uid = Math.floor(Math.random()*100000);
      const res = await fetch('/api/agora/token', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ channel, uid }) });
      const { token } = await res.json();

      const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      await client.join(process.env.NEXT_PUBLIC_AGORA_APP_ID!, channel!, token, uid);

      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      const cam = await AgoraRTC.createCameraVideoTrack();
      await client.publish([mic, cam]);

      // Render local video
      cam.play(localRef.current!);

      client.on('user-published', async (user:any, mediaType:any)=>{
        await client.subscribe(user, mediaType);
        if(mediaType === 'video'){
          user.videoTrack.play(remoteRef.current!);
        }
        if(mediaType === 'audio'){
          user.audioTrack.play();
        }
      });

      setJoined(true);
    } catch (e:any){
      setError(e.message || 'Failed to join room');
    }
  };

  return (
    <div className="panel">
      <h2>Video Room</h2>
      {!joined && <button className="btn btn-primary" onClick={join}>Join Room</button>}
      {error && <div className="muted">Error: {error}</div>}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem', marginTop:'.6rem'}}>
        <div className="panel"><div ref={localRef} style={{width:'100%', aspectRatio:'16/9'}} /></div>
        <div className="panel"><div ref={remoteRef} style={{width:'100%', aspectRatio:'16/9'}} /></div>
      </div>
    </div>
  )
}
