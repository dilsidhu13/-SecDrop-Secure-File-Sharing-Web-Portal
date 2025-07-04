require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');

// Import encryption/decryption handlers
const {
  uploadFile,
  downloadFile,
  getMetadata
} = require('./filesencryptdecrypt.js');

// Ensure tmp directory exists
const tempDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
// Multer config for temporary uploads
const upload = multer({ dest: tempDir });

const app = express();
app.use(cors());
app.use(express.json());

// 1) Upload & encrypt
app.post('/api/crypto/upload', upload.single('file'), uploadFile);

// 2) Fetch metadata (original filename)
app.get('/api/crypto/metadata/:id', getMetadata);

// 3) Decrypt & download
app.post('/api/crypto/decrypt/:id', downloadFile);

// Health check
app.get('/', (req, res) => res.send('SecDrop backend is running.'));

// Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`SecDrop backend listening on port ${port}`);
});
