import React from 'react';

export default function About() {
  return (
    <div className="about">
        <h1>About SecDrop</h1>
        <p>SecDrop is a secure file sharing platform designed to make file transfers simple, private, and efficient.</p>    
        <h2>Features</h2>
        <ul>    
            <li>Drag & Drop: Effortlessly upload multiple files with a simple drag and drop interface.</li>
            <li>Zero-Knowledge Encryption: Your files are encrypted end-to-end, ensuring that only you and your intended recipients can access them.</li>
            <li>One-Time Codes: Recipients verify downloads with a one-time code sent to their email.</li>
        </ul>                                                      
    </div>
  );
}