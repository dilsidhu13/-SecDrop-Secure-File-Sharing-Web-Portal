import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './DownloadPage.css';

export default function DownloadPage() {
  const { id } = useParams();
  const [originalName, setOriginalName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    fetch(`/api/crypto/metadata/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setOriginalName(data.originalName);
      })
      .catch(err => setStatus(`Error: ${err.message}`));
  }, [id]);

  const requestOtp = async () => {
    setStatus('Sending code…');
    try {
      const res = await fetch(`/api/crypto/request-otp/${id}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setStatus('Verification code sent!');
      setCodeSent(true);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleDownload = async () => {
    if (!passphrase || !otp) {
      setStatus('Please enter both passphrase and verification code.');
      return;
    }
    setStatus('Verifying and decrypting...');
    try {
      const res = await fetch(`/api/crypto/decrypt/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      setStatus('Download started.');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="download-container">
      <h2>Download Secure File</h2>
      {originalName ? <p><strong>Filename:</strong> {originalName}</p> : <p>Loading file information...</p>}
      <button onClick={requestOtp} disabled={codeSent}>Send Verification Code</button>
      <input type="password" placeholder="Passphrase" value={passphrase} onChange={e => setPassphrase(e.target.value)} disabled={!codeSent} />
      <input type="text" placeholder="Verification Code" value={otp} onChange={e => setOtp(e.target.value)} disabled={!codeSent} />
      <button onClick={handleDownload} disabled={!codeSent}>Download</button>
      {status && <p className="status">{status}</p>}
    </div>
  );
}