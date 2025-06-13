import React, { useState, useCallback, useRef, useEffect } from 'react';
import Peer from 'simple-peer';
import { deriveKey, encryptBlob, decryptBlob } from './encryption';
import base58 from 'bs58';
import './FileEncryptUpload.css';

export default function P2PTransfer() {
  const [file, setFile] = useState(null);
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');
  const [peer, setPeer] = useState(null);
  const [signalData, setSignalData] = useState('');
  const [remoteSignal, setRemoteSignal] = useState('');
  const [received, setReceived] = useState([]);
  const fileInputRef = useRef(null);

  const CHUNK_SIZE = 512 * 1024; // 512KB

  // Prevent drag/drop on the whole window from interfering
  useEffect(() => {
    const preventDefaults = e => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', preventDefaults, false);
    window.addEventListener('drop', preventDefaults, false);
    return () => {
      window.removeEventListener('dragover', preventDefaults, false);
      window.removeEventListener('drop', preventDefaults, false);
    };
  }, []);

  const genKeyA = useCallback(() => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return base58.encode(randomBytes);
  }, []);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
    setStatus(`Selected: ${f.name}`);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const chooseFile = () => fileInputRef.current?.click();

  const initPeer = useCallback((initiator) => {
    setStatus(initiator ? 'Sender ready' : 'Receiver ready');
    const p = new Peer({ initiator, trickle: false });
    p.on('signal', data => setSignalData(JSON.stringify(data)));
    p.on('connect', () => setStatus('Peer connected.'));
    p.on('data', async (data) => {
      const { done, iv, keyA, chunk, totalChunks } = JSON.parse(new TextDecoder().decode(data));
      if (chunk) {
        setReceived(prev => [...prev, chunk]);
        setStatus(`Receiving chunk ${received.length + 1}/${totalChunks}`);
      }
      if (done) {
        const ciphertext = Uint8Array.from(atob(received.join('')), c => c.charCodeAt(0));
        const cryptoKey = await deriveKey(keyA, keyB);
        const plain = await decryptBlob(ciphertext.buffer, new Uint8Array(iv), cryptoKey);
        const blob = new Blob([plain]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
        setStatus('File received and saved');
      }
    });
    setPeer(p);
  }, [keyB, file, received]);

  useEffect(() => {
    if (peer && remoteSignal) {
      peer.signal(JSON.parse(remoteSignal));
      setStatus('Signal processed');
    }
  }, [remoteSignal, peer]);

  const sendFile = async () => {
    if (!file || !keyB || !peer) return setStatus('Missing file, keyB or peer');
    const keyA = genKeyA();
    const cryptoKey = await deriveKey(keyA, keyB);
    const { ciphertext, iv } = await encryptBlob(file, cryptoKey);
    const bytes = new Uint8Array(ciphertext);
    const totalChunks = Math.ceil(bytes.length / CHUNK_SIZE);
    for (let i = 0; i < totalChunks; i++) {
      const slice = bytes.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunk64 = btoa(String.fromCharCode(...slice));
      peer.send(JSON.stringify({ chunk: chunk64, totalChunks }));
      while (peer.bufferedAmount > CHUNK_SIZE) await new Promise(r => setTimeout(r, 50));
      setStatus(`Sending ${i + 1}/${totalChunks}`);
    }
    peer.send(JSON.stringify({ done: true, iv: Array.from(iv), keyA }));
    setStatus('Send complete. Share Key A and Key B.');
  };

  return (
    <div className="file-upload-container">
      <h2>P2P Transfer</h2>

      {/* File dropzone */}
      <div
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        tabIndex={0}
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
        <button type="button" onClick={chooseFile} className="choose-button">
          Choose File
        </button>
      </div>

      {/* Password input */}
      <div className="password-input-container">
        <input
          type="password"
          placeholder="Key B"
          value={keyB}
          onChange={e => setKeyB(e.target.value)}
        />
      </div>

      {/* P2P controls */}
      <div className="signals">
        <button onClick={() => initPeer(true)}>As Sender</button>
        <button onClick={() => initPeer(false)}>As Receiver</button>
        <textarea readOnly value={signalData} rows={3} placeholder="Signal data" />
        <textarea value={remoteSignal} onChange={e => setRemoteSignal(e.target.value)} rows={3} placeholder="Paste remote signal" />
      </div>

      <div className="upload-button-container">
        <button onClick={sendFile}>Encrypt & Send P2P</button>
      </div>

      <p className="status-message">{status}</p>
    </div>
  );
}