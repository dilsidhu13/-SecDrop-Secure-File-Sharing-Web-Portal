// src/App.js
import React from 'react';
import FileEncryptUpload from './FileEncryptUpload.js';
import logo from './logo.webp';   // logo Photo
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        {/* Logo on the left */}
        <img src={logo} className="App-logo" alt="SecDrop logo" />

        {/* Text to the right of logo */}
        <div className="App-header-text">
          <h1>SecDrop</h1>
          <p>Secure, account-free file transfers</p>
        </div>
      </header>

      <main>
        <FileEncryptUpload />
      </main>
    </div>
  );
}

export default App;
