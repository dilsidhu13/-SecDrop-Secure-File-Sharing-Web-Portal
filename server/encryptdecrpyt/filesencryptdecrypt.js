const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

// In-Memory store mapping id -> { path, originalName, iv }
const uploads = {};
const FIXED_SALT = 'SecDropSalt';
async function deriveKey(keyB) {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(keyB, FIXED_SALT, 100000, 32, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Decrypt a file
async function decryptFile(src, dest, key, iv) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv, {
    authTagLength: 16,
  });
  await pipelineAsync(
    fs.createReadStream(src),
    decipher,
    fs.createWriteStream(dest)
  );
}

// Upload already-encrypted file with iv
async function uploadFile(req, res) {
  try {
    const { iv } = req.body;
    if (!req.file || !iv) {
      return res.status(400).json({ error: 'file and iv required' });
    }
    const id = crypto.randomUUID();
    uploads[id] = {
      path: req.file.path,
      originalName: req.file.originalname,
      iv: JSON.parse(iv),
    };
    res.json({
      message: 'File uploaded successfully',
      downloadUrl: `/download/${id}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// decrypt and send file after verifying key B
async function downloadFile(req, res) {
  const { id } = req.params;
  const { keyB } = req.body;
  const meta = uploads[id];
  if (!meta) return res.status(404).send('Invalid link');
  if (!keyB) return res.status(400).send('Key B required');
  try {
    const key = await deriveKey(keyB);
    const tmpPath = `${meta.path}.dec`;
    await decryptFile(meta.path, tmpPath, key, Buffer.from(meta.iv));
    res.download(tmpPath, meta.originalName, () => fs.unlinkSync(tmpPath));
  } catch (err) {
    console.error(err);
    res.status(500).send('Decryption failed');
  }
}

module.exports = { uploadFile, downloadFile };
module.exports._uploads = uploads;
