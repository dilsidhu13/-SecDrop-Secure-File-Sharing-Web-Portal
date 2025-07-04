// client/src/components/FileEncryptUpload.js
import React, { useState } from 'react';

/**
 * FileEncryptUpload component
 * Select a file and passphrase, upload to encrypt endpoint,
 * then display a download link for the encrypted file.
 */
export default function FileEncryptUpload() {
  const [file, setFile] = useState(null);
  const [passphrase, setPassphrase] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const onFileChange = (e) => {
    const selected = e.target.files[0] || null;
    setFile(selected);
    setStatus('');
    setDownloadUrl('');
  };

  const onEncryptUpload = async () => {
    if (!file || !passphrase) {
      setStatus('Please select a file and enter a passphrase.');
      return;
    }
    setStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('keyB', passphrase);

    try {
      const res = await fetch('/api/crypto/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);

      setStatus('Upload successful.');
      setDownloadUrl(`${window.location.origin}/download/${json.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '2rem auto', textAlign: 'center' }}>
      <h2>Encrypt & Upload File</h2>
      <input type="file" onChange={onFileChange} />
      <br />
      <input
        type="password"
        placeholder="Passphrase"
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        style={{ width: '100%', margin: '0.5rem 0', padding: '0.5rem' }}
      />
      <br />
      <button onClick={onEncryptUpload} style={{ padding: '0.5rem 1rem' }}>
        Upload
      </button>

      {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
      {downloadUrl && (
        <p style={{ marginTop: '1rem' }}>
          Download link: <a href={downloadUrl}>{downloadUrl}</a>
        </p>
      )}
    </div>
  );
}
