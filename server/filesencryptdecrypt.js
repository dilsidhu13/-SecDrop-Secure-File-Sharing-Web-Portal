require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { uploadToS3, downloadFromS3 } = require('./ec2');

const pipelineAsync = promisify(pipeline);
const FIXED_SALT = 'SecDropSalt';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// In-memory metadata store
const uploads = {};

// Helpers
const emailRegex = /\S+@\S+\.\S+/;
const phoneRegex = /^\+?\d{10,15}$/;
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create a reusable Gmail transporter
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

// Send initial file-ready notification (no OTP)
async function sendUploadNotification(recipient, url) {
  const messageText = `Your file is ready!\n\nAccess it here: ${url}\n\nEnter your passphrase and request a verification code on that page to download.`;
  const fromAddress = process.env.EMAIL_FROM_DISPLAY || `"SecDrop Support" <${process.env.EMAIL_FROM}>`;

  if (emailRegex.test(recipient)) {
    await mailTransporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: 'Your secure file is ready to download',
      text: messageText
    });
  } else if (phoneRegex.test(recipient)) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_FROM,
      to: recipient,
      body: messageText
    });
  } else {
    throw new Error('Invalid recipient format');
  }
}

// Send OTP notification separately
async function sendOTPNotification(recipient, url, otp) {
  const messageText = `Your verification code is ${otp}.\n\nDownload your file here: ${url}`;
  const fromAddress = process.env.EMAIL_FROM_DISPLAY || `"SecDrop Support" <${process.env.EMAIL_FROM}>`;

  if (emailRegex.test(recipient)) {
    await mailTransporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject: 'Your download verification code',
      text: messageText
    });
  } else if (phoneRegex.test(recipient)) {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      from: process.env.TWILIO_FROM,
      to: recipient,
      body: messageText
    });
  } else {
    throw new Error('Invalid recipient format');
  }
}

// Derive AES key via PBKDF2
async function deriveKey(pass) {
  return promisify(crypto.pbkdf2)(pass, FIXED_SALT, 100000, 32, 'sha256');
}

// Handler: Encrypt, upload to S3, and notify with link (no OTP)
async function uploadFile(req, res) {
  const files = req.files || [];
  const { keyB, recipient } = req.body;

  if (!files.length || !keyB || !recipient) {
    return res.status(400).json({ error: 'Missing files, passphrase, or recipient' });
  }

  const results = [];

  for (const file of files) {
    const id = crypto.randomUUID();
    const iv = crypto.randomBytes(16);
    const key = await deriveKey(keyB);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ext = path.extname(file.originalname);
    const localEncPath = path.join(
      path.dirname(file.path),
      `${file.filename}.enc${ext}`
    );
    const s3Key = `${id}${ext}.enc`;

    try {
      // Encrypt to local file
      await pipelineAsync(
        fs.createReadStream(file.path),
        cipher,
        fs.createWriteStream(localEncPath)
      );
      const authTagHex = cipher.getAuthTag().toString('hex');

      // Upload and cleanup
      await uploadToS3(localEncPath, s3Key);
      fs.unlinkSync(localEncPath);

      // Store metadata (no OTP yet)
      uploads[id] = {
        s3Key,
        originalName: file.originalname,
        ivHex: iv.toString('hex'),
        authTagHex,
        recipient
      };

      const downloadUrl = `${CLIENT_URL}/download/${id}`;
      // Send initial notification
      await sendUploadNotification(recipient, downloadUrl);

      results.push({ id, originalName: file.originalname, url: downloadUrl });

    } catch (err) {
      console.error('Error processing file', file.originalname, err);
      return res.status(500).json({ error: 'Encryption/upload failed' });
    } finally {
      // Cleanup temp upload
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
  }

  res.json({ results });
}

// Handler: Return original filename
function getMetadata(req, res) {
  const meta = uploads[req.params.id];
  if (!meta) return res.status(404).json({ error: 'Invalid file ID' });
  res.json({ originalName: meta.originalName });
}

// Handler: Regenerate OTP and notify
async function requestOtp(req, res) {
  const id = req.params.id;
  const meta = uploads[id];
  if (!meta) return res.status(404).json({ error: 'Invalid file ID' });

  const otp = generateOTP();
  meta.otp = otp;
  const downloadUrl = `${CLIENT_URL}/download/${id}`;

  try {
    await sendOTPNotification(meta.recipient, downloadUrl, otp);
    res.json({ message: 'OTP sent' });
  } catch (e) {
    console.error('OTP send failed', e);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

// Handler: Verify OTP, decrypt, and stream
async function downloadFile(req, res) {
  const { id } = req.params;
  const { keyB, otp } = req.body;
  const meta = uploads[id];
  if (!meta) return res.status(404).json({ error: 'Invalid file ID' });
  if (!otp || otp !== meta.otp) {
    return res.status(401).json({ error: 'Invalid verification code' });
  }

  try {
    const key = await deriveKey(keyB);
    const iv = Buffer.from(meta.ivHex, 'hex');
    const authTag = Buffer.from(meta.authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(meta.originalName)}"`
    );
    res.setHeader('Content-Type', 'application/octet-stream');

    await pipelineAsync(
      downloadFromS3(meta.s3Key),
      decipher,
      res
    );

    // Invalidate OTP after use
    delete meta.otp;
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Decryption failed' });
    else res.end();
  }
}

module.exports = {
  uploadFile,
  getMetadata,
  requestOtp,
  downloadFile
};
