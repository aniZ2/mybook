'use client';

import { Toaster } from 'react-hot-toast';
import './toastAnimations.css'; // ⬅️ add this new file below

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.3)',
          color: '#0f172a',
          fontWeight: 500,
          boxShadow:
            '0 4px 20px rgba(0,0,0,0.05), inset 0 0 20px rgba(255,255,255,0.05)',
          animation: 'toast-fade-in 0.3s ease',
        },
        success: {
          icon: '📖',
          style: {
            background: 'rgba(219,234,254,0.6)',
            border: '1px solid rgba(147,197,253,0.5)',
          },
        },
        error: {
          icon: '💔',
          style: {
            background: 'rgba(254,226,226,0.7)',
            border: '1px solid rgba(248,113,113,0.5)',
          },
        },
        loading: {
          icon: '⏳',
          style: {
            background: 'rgba(241,245,249,0.8)',
            border: '1px solid rgba(203,213,225,0.4)',
          },
        },
      }}
    />
  );
}
