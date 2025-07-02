// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FileEncryptUpload from './FileEncryptUpload.js';
import DownloadPage from './DownloadPage.js';
import logo from './logo.webp';   // logo Photo
import './App.css';

function App() {
  return (
    <Router>
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
          <Routes>
          <Route path="/" element={<FileEncryptUpload />} />
          <Route path="/download/:id" element={<DownloadPage />} />
        </Routes>
      </main>
    </div>
    </Router>

  );
}

export default App;
