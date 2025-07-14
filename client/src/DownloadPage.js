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
  const [downloadStarted, setDownloadStarted] = useState(false);

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
        let errMsg = 'Wrong passphrase & verification code, please try again.';
        try {
          const err = await res.json();
          if (
            err.error && (
              err.error.toLowerCase().includes('passphrase') ||
              err.error.toLowerCase().includes('otp') ||
              err.error.toLowerCase().includes('invalid') ||
              err.error.toLowerCase().includes('wrong') ||
              err.error.toLowerCase().includes('key') ||
              err.error.toLowerCase().includes('decrypt') ||
              err.error.toLowerCase().includes('decryption')
            )
          ) {
            errMsg = 'Wrong passphrase & verification code, please try again.';
            setPassphrase('');
            setOtp('');
          } else if (err.error) {
            errMsg = err.error;
          }
        } catch {}
        setStatus(errMsg);
        setLoading(false);
        return;
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
      setDownloadStarted(true);
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
      <button onClick={requestOtp} disabled={codeSent || downloadStarted}>Send Verification Code</button>
      <input
        type="password"
        placeholder="Passphrase"
        value={passphrase}
        onChange={e => setPassphrase(e.target.value)}
        disabled={!codeSent || downloadStarted}
      />
      <input
        type="text"
        placeholder="Verification Code"
        value={otp}
        onChange={e => setOtp(e.target.value)}
        disabled={!codeSent || downloadStarted}
      />
      <button onClick={handleDownload} disabled={!codeSent || loading || downloadStarted}>Download</button>
      {loading && <div className="spinner" />}
      {status && <p className="status">{status}</p>}
      {/* Add a link to upload another file at the bottom */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href="/" className="button">Click here to go Home Page. </a>
      </div>
    </div>
  );
}