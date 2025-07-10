import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileEncryptUpload.css';

export default function FileEncryptUpload() {
  const [files, setFiles] = useState([]);
  const [passphrase, setPassphrase] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);

  const onDrop = useCallback(accepted => {
    setFiles(accepted);
    setStatus('');
    setResults([]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const onEncryptUpload = async () => {
    if (!files.length || !passphrase || !recipient) {
      setStatus('Please select files, enter a passphrase, and recipient.');
      return;
    }
    setStatus('Uploading…');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('keyB', passphrase);
    formData.append('recipient', recipient.trim());

    try {
      const res = await fetch('/api/crypto/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      setStatus('Upload successful!');
      setResults(json.results);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  };

  return (
    <div className="upload-container">
      <h2>Secure Multi-File Upload</h2>
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>      
        <input {...getInputProps()} />
        {isDragActive ? <p>Drop files here…</p> : <p>Drag & drop files here, or click to select</p>}
      </div>
      {files.length > 0 && (
        <ul className="file-list">
          {files.map(f => <li key={f.path}>{f.path} ({Math.round(f.size/1024)} KB)</li>)}
        </ul>
      )}
      <input type="password" placeholder="Passphrase" value={passphrase} onChange={e => setPassphrase(e.target.value)} />
      <input type="text" placeholder="Recipient email or phone" value={recipient} onChange={e => setRecipient(e.target.value)} />
      <button onClick={onEncryptUpload}>Encrypt & Send</button>
      {status && <p className="status">{status}</p>}
      {results.length > 0 && (
        <div className="results">
          <h3>Download Links</h3>
          {results.map(r => (
            <div key={r.id} className="result-item">
              <strong>{r.originalName}:</strong> <a href={r.url} target="_blank" rel="noopener noreferrer">{r.url}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}