import React from 'react'
import logo from './logo.svg';
import FileEncryptUpload from './FileEncryptUpload.js';
import './App.css';

import { deriveKey, encryptBlob, decryptBlob } from './encryption.js'
console.log('deriveKey is a', typeof deriveKey)  // should print "function"
function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>SecDrop</h1>
        <p>Secure, account-free file transfers</p>
      </header>

      {/* This is your file upload/encryption interface */}
      <main>
        <FileEncryptUpload />
      </main>
    </div>
  );
}

// src/App.js

export default App;
