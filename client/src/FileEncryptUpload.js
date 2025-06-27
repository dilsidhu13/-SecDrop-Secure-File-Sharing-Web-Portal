// client/src/components/FileEncryptUpload.js
import React, { useState, useCallback, useRef } from 'react';
import { deriveKey, encryptBlob } from './encryption.js';
import base58 from 'bs58';
import './FileEncryptUpload.css';

export default function FileEncryptUpload() {
  const [file, setFile] = useState(null);
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const fileInputRef = useRef(null);

  // Generate a random Base58 Key A
  const genKeyA = useCallback(() => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return base58.encode(randomBytes);
  }, []);

  const handleFileSelect = (selected) => {
    setFile(selected);
    setDownloadUrl('');
    setStatus('');
  };

  const handleChooseClick = () => fileInputRef.current.click();
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  async function handleUpload() {
    if (!file || !keyB) {
      setStatus('Please select a file and enter Key B.');
      return;
    }

    try {
      setStatus('Deriving key…');
      const keyA = genKeyA();
      const cryptoKey = await deriveKey(keyA, keyB);

      setStatus('Encrypting file…');
      const { ciphertext, iv } = await encryptBlob(file, cryptoKey);

      setStatus('Uploading…');
      const form = new FormData();
      // Preserve original filename in upload
      form.append('file', new Blob([ciphertext], { type: file.type }), file.name);
      form.append('iv', JSON.stringify(Array.from(iv)));
      form.append('keyA', keyA);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      const { id } = await res.json();
      const downloadCode = id;
      const url = `${window.location.origin}/api/download/${id}`;

      setStatus(`Success! Share this code + your Key B: ${downloadCode}`);
      setDownloadUrl(url);
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
      setDownloadUrl('');
    }
  }

  return (
    <div className="file-encrypt-upload">
      <h2>SecDrop: Drag & Drop or Choose File</h2>

      <div
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {file ? (
          <p>{file.name}</p>
        ) : (
          <p>Drag & drop a file here</p>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="file-input"
          onChange={e => e.target.files[0] && handleFileSelect(e.target.files[0])}
        />
      </div>

      <button type="button" onClick={handleChooseClick} className="choose-button">
        Choose File
      </button>

      <input
        type="password"
        placeholder="Enter your Password to encrypt"
        value={keyB}
        onChange={e => setKeyB(e.target.value)}
      />

      <button onClick={handleUpload}>Encrypt & Upload</button>

      <p className="status-message">{status}</p>
      {downloadUrl && (
        <div className="download-link">
          <strong>Download Link:</strong>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
            {downloadUrl}
          </a>
          <button onClick={() => navigator.clipboard.writeText(downloadUrl)}>
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
}
