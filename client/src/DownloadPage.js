// client/src/DownloadPage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './DownloadPage.css';

export default function DownloadPage() {
  const { id } = useParams();
  const [originalName, setOriginalName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    fetch(`/api/crypto/metadata/${id}`)
      .then(res => res.json())
      .then(data => setOriginalName(data.originalName || ''))
      .catch(() => setStatus('Failed to load file info'));
  }, [id]);

  const requestOtp = async () => {
    setStatus('Sending verification code...');
    try {
      const res = await fetch(`/api/crypto/request-otp/${id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setStatus('Code sent!');
      setCodeSent(true);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleDownload = async () => {
    if (!passphrase || !otp) {
      setStatus('Enter both passphrase & verification code');
      return;
    }
    setLoading(true);
    setStatus('Verifying and downloading...');
    try {
      const res = await fetch(`/api/crypto/decrypt/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyB: passphrase, otp })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setStatus('Download started');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="download-container">
      <h2>Download Secure File</h2>
      {originalName && <p className="filename">{originalName}</p>}
      <button onClick={requestOtp} disabled={codeSent}>Send Verification Code</button>
      <input
        type="password"
        placeholder="Passphrase"
        value={passphrase}
        onChange={e => setPassphrase(e.target.value)}
        disabled={!codeSent}
      />
      <input
        type="text"
        placeholder="Verification Code"
        value={otp}
        onChange={e => setOtp(e.target.value)}
        disabled={!codeSent}
      />
      <button onClick={handleDownload} disabled={!codeSent || loading}>Download</button>
      {loading && <div className="spinner" />}
      {status && <p className="status">{status}</p>}
    </div>
  );
}