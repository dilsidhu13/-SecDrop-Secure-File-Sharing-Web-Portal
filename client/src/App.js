import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Homepage from './Homepage';
import FileEncryptUpload from './FileEncryptUpload';
import DownloadPage from './DownloadPage';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/upload" element={<FileEncryptUpload />} />
        <Route path="/download/:id" element={<DownloadPage />} />
      </Routes>
    </Router>
  );
}