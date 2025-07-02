import React, { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function DownloadPage() {
  const { id } = useParams();
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('Decrypting...');
    try {
      const res = await fetch(`/api/crypto/decrypt/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyB })
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = /filename="?([^\"]+)"?/i.exec(disposition);
      a.href = url;
      a.download = match ? match[1] : 'download';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus('Download started.');
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  }

  return (
    <div className="download-page">
      <h2>Enter your password to decrypt</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={keyB}
          onChange={e => setKeyB(e.target.value)}
          placeholder="Password"
        />
        <button type="submit">Download</button>
      </form>
      <p>{status}</p>
    </div>
  );
}