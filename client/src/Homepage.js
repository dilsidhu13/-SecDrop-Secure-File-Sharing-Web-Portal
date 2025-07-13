import React from 'react';
import { Link } from 'react-router-dom';
import './Homepage.css';

export default function Homepage() {
  return (
    <div className="homepage">
      <header className="hero">
        <div className="hero-content">
          <h1 className="hero-title">SecDrop</h1>
          <p className="hero-subtitle">Minimal. Secure. Effortless file sharing.</p>
          <Link to="/upload" className="button">Get Started</Link>
        </div>
      </header>

      <section className="features">
        <div className="feature">
          <h2>Drag & Drop</h2>
          <p>Seamless multi-file uploads with a single gesture.</p>
        </div>
        <div className="feature">
          <h2>Zero-Knowledge Encryption</h2>
          <p>Your files stay private, end to end.</p>
        </div>
        <div className="feature">
          <h2>One-Time Codes</h2>
          <p>Recipients verify downloads with OTP.</p>
        </div>
      </section>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} SecDrop. All rights reserved.</p>
      </footer>
    </div>
  );
}