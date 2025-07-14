import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import './FileEncryptUpload.css';
import { QRCodeSVG } from 'qrcode.react';

export default function FileEncryptUpload() {
  const [files, setFiles] = useState([]);
  const [passphrase, setPassphrase] = useState('');
  const [recipient, setRecipient] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const xhrRef = useRef(null);

  const onDrop = useCallback(accepted => {
    setFiles(accepted);
    setStatus('');
    setResults([]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });

  const onEncryptUpload = () => {
    if (!files.length || !passphrase || !recipient) {
      setStatus('Please select files, enter passphrase & recipient.');
      return;
    }
    setStatus('Uploading...');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    formData.append('keyB', passphrase);
    formData.append('recipient', recipient.trim());

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', '/api/crypto/upload');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        setResults(json.results);
        setStatus('Upload complete!');
      } else {
        setStatus(`Error: ${xhr.statusText}`);
      }
      setProgress(0);
    };
    xhr.onerror = () => setStatus('Upload failed');
    xhr.send(formData);
  };

  return (
    <div className="upload-container">
      <h2>Secure Multi-File Upload</h2>
      {/* Hide upload UI after upload is complete */}
      {results.length === 0 && (
        <>
          <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>      
            <input {...getInputProps()} />
            {isDragActive ? <p>Drop files here…</p> : <p>Drag & drop files, or click to select</p>}
          </div>
          {files.length > 0 && (
            <ul className="file-list">
              {files.map(f => <li key={f.path}>{f.path} ({Math.round(f.size/1024)} KB)</li>)}
            </ul>
          )}
          <input
            type="password"
            placeholder="Passphrase"
            value={passphrase}
            onChange={e => setPassphrase(e.target.value)}
          />
          <input
            type="text"
            placeholder="Recipient email or phone"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
          <button onClick={onEncryptUpload}>Encrypt & Send</button>
          {progress > 0 && (
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }} />
            </div>
          )}
        </>
      )}
      {status && <p className="status">{status}</p>}
      {results.length > 0 && (
        <div className="results">
          <h3>Download Links</h3>
          {results.map(r => (
            <div key={r.id} className="result-item">
              <strong>{r.originalName}:</strong> <a href={r.url}>{r.url}</a>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                <QRCodeSVG value={r.url} size={180} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}