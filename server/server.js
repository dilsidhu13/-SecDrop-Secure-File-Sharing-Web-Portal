require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile, downloadFile, getMetadata, requestOtp } = require('./filesencryptdecrypt');

// Ensure tmp directory
const tempDir = path.join(__dirname, 'tmp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: tempDir });
app.post('/api/crypto/upload', upload.array('files'), uploadFile);
app.get('/api/crypto/metadata/:id', getMetadata);
app.post('/api/crypto/request-otp/:id', requestOtp);
app.post('/api/crypto/decrypt/:id', downloadFile);
app.get('/', (req, res) => res.send('SecDrop backend is running.'));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`SecDrop backend listening on port ${port}`));