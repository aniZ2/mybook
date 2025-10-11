'use client';

import { useEffect, useState } from 'react';

export default function Accessibility(){
  const [large, setLarge] = useState(false);
  const [dyslexic, setDyslexic] = useState(false);
  useEffect(()=>{
    document.body.style.fontSize = large ? '18px' : '';
    document.body.style.fontFamily = dyslexic ? 'OpenDyslexic, system-ui' : '';
  }, [large, dyslexic]);
  return (
    <div className="panel">
      <h2>Accessibility</h2>
      <label><input type="checkbox" checked={large} onChange={e=>setLarge(e.target.checked)} /> Large text</label><br />
      <label><input type="checkbox" checked={dyslexic} onChange={e=>setDyslexic(e.target.checked)} /> Dyslexic-friendly font</label>
      <p className="muted">Note: Include the font via your preferred CDN or @font-face in production.</p>
    </div>
  )
}
