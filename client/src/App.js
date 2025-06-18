// src/App.js
import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage.js';
import FileEncryptUpload from './FileEncryptUpload.js';
import P2PFileTransfer from './P2PFileTransfer.js';
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

      <nav style={{ margin: '1rem' }}>
        <Link to="/upload">Encrypted Upload</Link>
        <Link to="/p2p" style={{ marginLeft: '1rem' }}>P2P Transfer</Link>
      </nav>

      <main>
// 
 <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<FileEncryptUpload />} />
          <Route path="/p2p" element={<P2PFileTransfer />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
