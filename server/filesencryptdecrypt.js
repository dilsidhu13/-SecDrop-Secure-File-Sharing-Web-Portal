// server/filesencryptdecrypt.js

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { uploadToS3, downloadFromS3 } = require('./ec2');

const pipelineAsync = promisify(pipeline);
const FIXED_SALT = 'SecDropSalt';

// In-memory store mapping file ID -> metadata
const uploads = {};

/**
 * Derive a 32-byte AES-GCM key from a passphrase using PBKDF2.
 * @param {string} keyB - User-provided passphrase
 * @returns {Promise<Buffer>} - Derived key
 */
async function deriveKey(keyB) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(keyB, FIXED_SALT, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Handle file upload: encrypt with AES-GCM, upload to S3, save metadata.
 * Expects `req.file` (via multer) and `req.body.keyB`.
 */
async function uploadFile(req, res) {
  if (!req.file || !req.body.keyB) {
    return res.status(400).json({ error: 'file and keyB required' });
  }

  const { originalname, path: tempPath } = req.file;
  const keyB = req.body.keyB;

  try {
    // Generate AES-GCM parameters
    const iv = crypto.randomBytes(12);
    const key = await deriveKey(keyB);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const id = crypto.randomUUID();
    const s3Key = `${id}.enc`;

    // Encrypt to a temporary local file
    const localEncPath = path.join(path.dirname(tempPath), `${id}.enc`);
    await pipelineAsync(
      fs.createReadStream(tempPath),
      cipher,
      fs.createWriteStream(localEncPath)
    );

    // Capture authentication tag
    const authTagHex = cipher.getAuthTag().toString('hex');

    // Upload encrypted file to S3
    await uploadToS3(localEncPath, s3Key);

    // Clean up local encrypted file
    fs.unlinkSync(localEncPath);

    // Store metadata in memory
    uploads[id] = {
      s3Key,
      originalName: originalname,
      ivHex: iv.toString('hex'),
      authTagHex
    };

    // Respond with file ID
    res.json({ id });
  } catch (err) {
    console.error('Encryption/upload error:', err);
    res.status(500).json({ error: 'Encryption or upload failed' });
  } finally {
    // Always clean up the multer temp file
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
}

/**
 * Handle file download: fetch from S3, decrypt with AES-GCM, stream to client.
 * Expects `req.params.id` and `req.body.keyB`.
 */
async function downloadFile(req, res) {
  const { id } = req.params;
  const { keyB } = req.body;
  const meta = uploads[id];

  if (!meta) {
    return res.status(404).json({ error: 'Invalid file ID' });
  }

  try {
    const key = await deriveKey(keyB);
    const iv = Buffer.from(meta.ivHex, 'hex');
    const authTag = Buffer.from(meta.authTagHex, 'hex');

    // Prepare response headers
    const encodedName = encodeURIComponent(meta.originalName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    // Set up AES-GCM decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Stream from S3 → decrypt → client
    const encryptedStream = downloadFromS3(meta.s3Key);
    await pipelineAsync(
      encryptedStream,
      decipher,
      res
    );
  } catch (err) {
    console.error('Decryption/download error:', err);
    if (!res.headersSent) {
      res.status(500).send('Decryption failed');
    } else {
      res.end();
    }
  }
}

/**
 * Return the original filename for a given file ID.
 */
function getMetadata(req, res) {
  const { id } = req.params;
  const meta = uploads[id];
  if (!meta) {
    return res.status(404).json({ error: 'Invalid file ID' });
  }
  res.json({ originalName: meta.originalName });
}

module.exports = {
  uploadFile,
  downloadFile,
  getMetadata
};
