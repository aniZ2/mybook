'use client';

import { useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import { BrowserCodeReader } from '@zxing/browser';

export default function ScanISBN(){
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [torchOn, setTorchOn] = useState(false);

  // Prefer EAN-13 / UPC-A for ISBNs
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A]);
  const reader = new BrowserMultiFormatReader(hints);

  const applyCameraConstraints = async (stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    try {
      const caps: any = track.getCapabilities?.() || {};
      const cons: any = {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) cons.focusMode = 'continuous';
      if (caps.torch) cons.torch = torchOn;
      await track.applyConstraints({ advanced: [cons], facingMode: 'environment' } as any);
    } catch {}
  };

  const start = async () => {
    setError(null);
    setScanning(true);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      await applyCameraConstraints(stream);
      if (videoRef.current){
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      // Decode continuously from the camera
      reader.decodeFromVideoDevice(null, videoRef.current!, (res, err) => {
        if (res) {
          const raw = res.getText();
          const digits = raw.replace(/[^0-9Xx]/g, '');
          if (digits.length >= 10) setIsbn(digits);
        }
      });
    } catch (e: any) {
      setError(e?.message || 'Camera error');
      setScanning(false);
    }
  };

  const stop = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    reader.reset();
    if (stream) stream.getTracks().forEach(t => t.stop());
    setScanning(false);
  };

  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const caps: any = track.getCapabilities?.() || {};
      if (!caps.torch) return alert('Torch not supported on this device');
      setTorchOn(t => !t);
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
    } catch {}
  };

  const lookup = async () => {
    if (!isbn) return;
    setResult(null);
    const r = await fetch('/api/books/isbn?isbn=' + encodeURIComponent(isbn));
    const data = await r.json();
    setResult(data);
  };

  return (
    <section className="panel col-12">
      <h2 className="h2">Scan ISBN</h2>

      <div style={{ position:'relative', maxWidth: 480, margin:'0 auto' }}>
        <video ref={videoRef} style={{width:'100%', borderRadius:12, border:'1px solid rgba(255,255,255,0.2)'}} muted playsInline />
        {/* overlay */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'10%', left:'10%', right:'10%', bottom:'10%',
                        border:'2px solid rgba(255,255,255,0.6)', borderRadius:16 }} />
          <div style={{ position:'absolute', bottom:8, left:0, right:0, textAlign:'center',
                        color:'#fff', textShadow:'0 1px 2px #000' }}>
            Align barcode inside the frame
          </div>
        </div>
      </div>

      <div style={{display:'flex', gap:'.6rem', marginTop:'.6rem', flexWrap:'wrap', justifyContent:'center'}}>
        {!scanning
          ? <button className="btn btn-primary" onClick={start}>Start Camera</button>
          : <button className="btn" onClick={stop}>Stop</button>}
        <button className="btn" onClick={toggleTorch}>Toggle Torch</button>
        <input className="input" value={isbn} onChange={e=>setIsbn(e.target.value)} placeholder="or type ISBN" style={{maxWidth:220}} />
        <button className="btn" onClick={lookup}>Lookup</button>
      </div>

      {error && <div className="muted" style={{marginTop:8}}>Error: {error}</div>}
      {result && <pre style={{whiteSpace:'pre-wrap', marginTop:8}}>{JSON.stringify(result, null, 2)}</pre>}
    </section>
  );
}
