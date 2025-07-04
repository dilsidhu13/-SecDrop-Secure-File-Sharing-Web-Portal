import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function DownloadPage() {
  const { id } = useParams();
  const [keyB, setKeyB] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalName, setOriginalName] = useState('');

  // Fetch original filename metadata
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const res = await fetch(`/api/crypto/metadata/${id}`);
        if (!res.ok) throw new Error(`Metadata error: ${res.status}`);
        const json = await res.json();
        setOriginalName(json.originalName || id);
      } catch (err) {
        console.error('Metadata fetch error:', err);
        setOriginalName(id);
      }
    }
    fetchMetadata();
  }, [id]);

  const handleDownload = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/crypto/decrypt/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyB }),
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);

      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      // Extract filename or fallback
      let filename = originalName || 'download';
      const match = /filename\*?=(?:UTF-8'')?"?([^;"\n]+)"?/i.exec(cd);
      if (match) filename = decodeURIComponent(match[1]);

      // Trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', textAlign: 'center' }}>
      <h2>Download SecDrop File</h2>
      <p>File: <strong>{originalName || id}</strong></p>
      <input
        type="password"
        placeholder="Enter passphrase"
        value={keyB}
        onChange={(e) => setKeyB(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}
      />
      <button
        onClick={handleDownload}
        disabled={!keyB || loading}
        style={{ padding: '0.5rem 1rem' }}
      >
        {loading ? 'Downloading...' : 'Download'}
      </button>
      {error && <p style={{ color: 'red', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
