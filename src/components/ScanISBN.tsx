'use client';

import { useRef, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import styles from './ScanISBN.module.css';

interface LookupResult {
  title?: string;
  authors?: string[];
  isbn10?: string;
  isbn13?: string;
  coverUrl?: string;
  [key: string]: any;
}

export default function ScanISBN() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [isbn, setIsbn] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);

  /* ─────────────── Setup Reader ─────────────── */
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A]);
  const reader = new BrowserMultiFormatReader(hints);

  async function applyCameraConstraints(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    try {
      const caps: any = track.getCapabilities?.() || {};
      const cons: any = {};
      if (caps.focusMode?.includes('continuous')) cons.focusMode = 'continuous';
      if (caps.torch) cons.torch = torchOn;
      await track.applyConstraints({ advanced: [cons], facingMode: 'environment' } as any);
    } catch {
      // silently ignore unsupported constraints
    }
  }

  /* ─────────────── Start / Stop Camera ─────────────── */
  const start = async () => {
    setError(null);
    setScanning(true);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      await applyCameraConstraints(stream);
      if (videoRef.current) {
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
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setScanning(false);
  };

  /* ─────────────── Torch Toggle ─────────────── */
  const toggleTorch = async () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    try {
      const caps: any = track.getCapabilities?.() || {};
      if (!caps.torch) return alert('Torch not supported on this device');
      setTorchOn((t) => !t);
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] } as any);
    } catch {
      setError('Failed to toggle torch.');
    }
  };

  /* ─────────────── Lookup Book by ISBN ─────────────── */
  const lookup = async () => {
    if (!isbn.trim()) return;
    setResult(null);
    try {
      const res = await fetch('/api/books/isbn?isbn=' + encodeURIComponent(isbn));
      if (!res.ok) throw new Error(`Lookup failed: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch book data.');
    }
  };

  /* ─────────────── Render ─────────────── */
  return (
    <section className={styles.panel}>
      <h2 className={styles.h2}>📖 Scan ISBN</h2>

      <div className={styles.videoBox}>
        <video ref={videoRef} className={styles.video} muted playsInline />
        <div className={styles.overlay}>
          <div className={styles.frame} />
          <div className={styles.hint}>Align barcode inside the frame</div>
        </div>
      </div>

      <div className={styles.controls}>
        {!scanning ? (
          <button className={`${styles.btn} ${styles['btn-primary']}`} onClick={start}>
            Start Camera
          </button>
        ) : (
          <button className={styles.btn} onClick={stop}>
            Stop
          </button>
        )}
        <button className={styles.btn} onClick={toggleTorch}>
          Toggle Torch
        </button>
        <input
          className={styles.input}
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          placeholder="or type ISBN"
        />
        <button className={styles.btn} onClick={lookup}>
          Lookup
        </button>
      </div>

      {error && <div className={styles.muted}>Error: {error}</div>}
      {result && (
  <div className={styles.resultBox}>
    <pre>{JSON.stringify(result, null, 2)}</pre>
  </div>
)}

    </section>
  );
}
