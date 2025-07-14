
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './Navbar';
import Homepage from './Homepage';
//import About from './About';
//import p2pTransfer from './P2PTransfer'; // Assuming you have a P2PTransfer component
import FileEncryptUpload from './FileEncryptUpload';
import DownloadPage from './DownloadPage';
import DonationPage from './DonationPage';
import './App.css';

export default function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Homepage />} />
        <Route path="/upload" element={<FileEncryptUpload />} />
        <Route path="/download/:id" element={<DownloadPage />} />
        {/*<Route path="/about" element={<About />} />*/}
        <Route path="/donate" element={<DonationPage />}/>
      </Routes>
    </Router>
  );
}