// client/src/components/FileEncryptUpload.js
import React, { useState, useRef } from 'react';
import './FileEncryptUpload.css';

export default function FileEncryptUpload() {
  const [file, setFile] = useState(null);
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setStatus(`Selected file: ${selectedFile.name}`);
  };

  // Drag-and-drop handlers
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      handleFileSelect(droppedFiles[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Fallback for choosing file button
  const handleChooseClick = () => {
    fileInputRef.current && fileInputRef.current.click();
  };

  async function handleUpload() {
    if (!file || !keyB) {
      setStatus('Please select a file and enter your password.');
      return;
    }

    try {
      setStatus('Encrypting file…');
      // Derive key using only keyB and a fixed salt
      const encoder = new TextEncoder();
      const salt = encoder.encode('SecDropSalt');
      const passphrase = encoder.encode(keyB);
      const baseKey = await window.crypto.subtle.importKey(
        'raw', passphrase, { name: 'PBKDF2' }, false, ['deriveKey']
      );
      const cryptoKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const data = new Uint8Array(await file.arrayBuffer());
      const ciphertext = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        data
      );

      setStatus('Uploading…');
      const form = new FormData();
      form.append('file', new Blob([ciphertext], { type: file.type }));
      form.append('iv', JSON.stringify(Array.from(iv)));

      const res = await fetch('/api/crypto/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      const { downloadUrl } = await res.json();

      setStatus('Success! Save the download link below: ');
      setDownloadUrl(downloadUrl || '');
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
      setDownloadUrl('');
    }
  }

  return (
    <div className="file-upload-container">
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
        {/* Hidden file input for both drag-and-drop and choose button */}
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
        placeholder="Enter your password to encrypt"
        value={keyB}
        onChange={e => setKeyB(e.target.value)}
      />
      <button onClick={handleUpload}>Encrypt & Upload</button>
      <p className="status-message">{status}</p>
      {downloadUrl && (
        <div className="download-link">
          <strong>Download Link:</strong>
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer">{downloadUrl}</a>
          <button onClick={() => navigator.clipboard.writeText(downloadUrl)}>Copy Link</button>
        </div>
      )}
    </div>
  );
}
