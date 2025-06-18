import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing-page" style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h2>Welcome to SecDrop</h2>
      <p>Select a mode to begin:</p>
      <div style={{ marginTop: '1rem' }}>
        <Link to="/upload">
          <button>Encrypted Upload</button>
        </Link>
        <Link to="/p2p" style={{ marginLeft: '1rem' }}>
          <button>P2P Transfer</button>
        </Link>
      </div>
    </div>
  );
}