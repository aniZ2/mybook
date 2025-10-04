'use client';
import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

export default function ScanISBN(){
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [torchOn, setTorchOn] = useState(false);

  const applyCameraConstraints = async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    try {
      // autofocus & torch if supported
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      const cons: any = {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) cons.focusMode = 'continuous';
      if (caps.torch) cons.torch = torchOn;
      // prefer environment camera
      await track.applyConstraints({ advanced: [cons], facingMode: 'environment' } as any);
    } catch {}
  };

  const start = async () => {
    setError(null);
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      await applyCameraConstraints(stream);
      if (videoRef.current){ videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const reader = new BrowserQRCodeReader();
      await reader.decodeFromVideoDevice(undefined, videoRef.current!, (res, err)=>{
        if(res){
          const txt = res.getText();
          const maybeIsbn = txt.replace(/[^0-9Xx]/g,'');
          if(maybeIsbn && maybeIsbn.length >= 10){
            setIsbn(maybeIsbn);
          }
        }
      });
    } catch(e:any){
      setError(e.message || 'Camera error'); setScanning(false);
    }
  };

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const caps: any = track.getCapabilities ? track.getCapabilities() : {};
      if (!caps.torch) return alert('Torch not supported on this device');
      setTorchOn(t => !t);
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
    } catch {}
  };

  const lookup = async () => {
    setResult(null);
    const r = await fetch('/api/books/isbn?isbn='+encodeURIComponent(isbn));
    const data = await r.json();
    setResult(data);
  };

  return (
    <div className="panel">
      <h2>Scan ISBN</h2>

      <div style={{ position:'relative', maxWidth: 420, margin:'0 auto' }}>
        <video ref={videoRef} style={{width:'100%', borderRadius:12, border:'1px solid #1e2230'}} muted playsInline />
        {/* overlay */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'10%', left:'10%', right:'10%', bottom:'10%', border:'2px solid rgba(255,255,255,0.6)', borderRadius:16 }} />
          <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center', color:'#fff', textShadow:'0 1px 2px #000' }}>
            Align barcode inside the frame
          </div>
        </div>
      </div>

      <div style={{display:'flex', gap:'.6rem', marginTop:'.6rem', flexWrap:'wrap'}}>
        {!scanning && <button className="btn btn-primary" onClick={start}>Start Camera</button>}
        <button className="btn" onClick={toggleTorch}>Toggle Torch</button>
        <input className="input" value={isbn} onChange={e=>setIsbn(e.target.value)} placeholder="or type ISBN" />
        <button className="btn" onClick={lookup}>Lookup</button>
      </div>

      {error && <div className="muted">Error: {error}</div>}
      {result && <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )
}
