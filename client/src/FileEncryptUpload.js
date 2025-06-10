import React, { useState } from 'react';
import { deriveKey, encryptBlob } from './encryption.js';
import base58 from 'bs58';

export default function FileEncryptUpload() {
  const [file, setFile] = useState(null);
  const [keyB, setKeyB] = useState('');
  const [status, setStatus] = useState('');

  // Generate a random Base58 Key A
  function genKeyA() {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    return base58.encode(randomBytes);
  }

  async function handleUpload() {
    if (!file || !keyB) {
      setStatus('Select a file and enter Key B first.');
      return;
    }

    try {
      setStatus('Deriving key…');
      const keyA = genKeyA();
      const cryptoKey = await deriveKey(keyA, keyB);

      setStatus('Encrypting file…');
      const { ciphertext, iv } = await encryptBlob(file, cryptoKey);

      setStatus('Uploading…');
      // Build a FormData payload
      const form = new FormData();
      form.append('file', new Blob([ciphertext], { type: file.type }));
      form.append('iv', JSON.stringify(Array.from(iv)));
      form.append('keyA', keyA);

      const res = await fetch('server/api/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) throw new Error(await res.text());
      const { downloadCode } = await res.json();

      setStatus(`Success! Share this code + your Key B to download: ${downloadCode}`);
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  }

  return (
    <div>
      <h2>SecDrop: Encrypt & Upload</h2>

      <input
        type="file"
        onChange={e => setFile(e.target.files[0] || null)}
      />

      <input
        type="password"
        placeholder="Enter your Key B"
        value={keyB}
        onChange={e => setKeyB(e.target.value)}
      />

      <button onClick={handleUpload}>Encrypt & Upload</button>

      <p>{status}</p>
    </div>
  );
}
