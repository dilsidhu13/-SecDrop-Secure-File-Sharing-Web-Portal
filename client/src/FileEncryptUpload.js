// client/src/components/FileEncryptUpload.js
import React, { useState, useCallback, useRef } from 'react';
import { deriveKey, encryptBlob } from './encryption.js';
import base58 from 'bs58';
import './FileEncryptUpload.css';

export default function FileEncryptUpload() {
  const [file, setFile] = useState(null);
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');
  const fileInputRef = useRef(null);

  // Generate a random Base58 Key A
  const genKeyA = useCallback(() => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return base58.encode(randomBytes);
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFile) => {
    setFile(selectedFile);
    setStatus(`Selected file: ${selectedFile.name}`);
  }, []);

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
      form.append('file', new Blob([ciphertext], { type: file.type }));
      form.append('iv', JSON.stringify(Array.from(iv)));
      form.append('keyA', keyA);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      const { downloadCode } = await res.json();

      setStatus(`Success! Share this code + your Key B: ${downloadCode}`);
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  }

  return (
    <div className="file-upload-container">
      <h2>SecDrop: Drag & Drop or Choose File</h2>

      {/* File dropzone */}
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

      {/* Choose file button */}
      <div className="choose-file-button-container">
        <button type="button" onClick={handleChooseClick} className="choose-button">
          Choose File
        </button>
      </div>

      {/* Password input */}
      <div className="password-input-container">
        <input
          type="password"
          placeholder="Enter your Key B"
          value={keyB}
          onChange={e => setKeyB(e.target.value)}
        />
      </div>

      {/* Encrypt & Upload button */}
      <div className="upload-button-container">
        <button onClick={handleUpload}>Encrypt & Upload</button>
      </div>

      <p className="status-message">{status}</p>
    </div>
  );
}
