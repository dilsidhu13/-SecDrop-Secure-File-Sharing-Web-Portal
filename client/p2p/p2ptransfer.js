import React from 'react';
import { Link } from 'react-router-dom';

export default function P2PTransfer() {
  return (
    <div className="p2p-transfer">
      <h1>P2P File Transfer</h1>
      <p>Securely transfer files directly between users without intermediaries.</p>
      <Link to="/upload" className="button">Upload File</Link>
    </div>
  );
}