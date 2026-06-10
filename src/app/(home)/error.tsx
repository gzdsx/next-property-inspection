'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '20px',
      background: '#0b0f19',
      color: '#f8fafc',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{ fontSize: '3rem' }}>⚠️</div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Something went wrong</h2>
      <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, maxWidth: '400px', textAlign: 'center' }}>
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={reset}
        style={{
          padding: '10px 24px',
          background: '#3b82f6',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.9rem'
        }}
      >
        Try Again
      </button>
    </div>
  );
}
