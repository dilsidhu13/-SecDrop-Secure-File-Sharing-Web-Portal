import React from 'react';

export default function DonationPage() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '80vh',
      backgroundColor: '#f9f9f9',
      padding: '2rem'
    }}>
      <h1 style={{ marginBottom: '1rem' }}>Support Our Project ❤️</h1>
      <p style={{ maxWidth: '600px', textAlign: 'center', marginBottom: '2rem' }}>
        Your donations help us keep this project alive and improve it. Any contribution is deeply appreciated!
      </p>
      
      <a
        href="https://www.paypal.com/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#0070ba',
          color: 'white',
          borderRadius: '8px',
          fontSize: '1.2rem',
          textDecoration: 'none',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        Donate
      </a>
    </div>
  );
}
