const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

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
 * Handle file upload: encrypt with AES-GCM, save file + metadata (including authTag).
 * Expects `req.file` (e.g. via multer) and `req.body.keyB`.
 */
async function uploadFile(req, res) {
  if (!req.file || !req.body.keyB) {
    return res.status(400).json({ error: 'file and keyB required' });
  }
  const { originalname, path: tempPath } = req.file;
  const keyB = req.body.keyB;

  const iv = crypto.randomBytes(12);
  const key = await deriveKey(keyB);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const id = crypto.randomUUID();

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const outPath = path.join(uploadsDir, `${id}.enc`);

  try {
    // Encrypt → file
    await pipelineAsync(
      fs.createReadStream(tempPath),
      cipher,
      fs.createWriteStream(outPath)
    );
    // Capture GCM authentication tag
    const authTagHex = cipher.getAuthTag().toString('hex');

    uploads[id] = {
      path: outPath,
      originalName: originalname,
      ivHex: iv.toString('hex'),
      authTagHex
    };
    res.json({ id });
  } catch (err) {
    console.error('Encryption error:', err);
    res.status(500).json({ error: 'Encryption failed' });
  }
}

/**
 * Handle file download: verify authTag, decrypt, and stream back.
 * Expects `req.body.keyB` with the same passphrase used on upload.
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
    const encodedName = encodeURIComponent(meta.originalName);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedName}"; filename*=UTF-8''${encodedName}`
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    // Recreate IV and authTag buffers
    const iv = Buffer.from(meta.ivHex, 'hex');
    const authTag = Buffer.from(meta.authTagHex, 'hex');

    // Set up AES-GCM decipher and verify tag
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    // Stream decrypted data to client
    await pipelineAsync(
      fs.createReadStream(meta.path),
      decipher,
      res
    );
  } catch (err) {
    console.error('Decryption error:', err);
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
  if (!meta) return res.status(404).json({ error: 'Invalid file ID' });
  res.json({ originalName: meta.originalName });
}

module.exports = { uploadFile, downloadFile, getMetadata };
