import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

export default function Navbar() {
  return (
    <nav className="nav">
      <div className="logo-text">SecDrop</div>
      <ul className="nav-list">
        <li><Link to="/">Home</Link></li>
        <li><Link to="/upload">Upload</Link></li>
      <Link to="/p2p" className="nav-link p2p-link">
        <span className="badge--blink">Coming Soon</span>
        P2P Transfer
      </Link>
        <li><Link to="/about">About</Link></li>
      </ul>
    </nav>
  );
}