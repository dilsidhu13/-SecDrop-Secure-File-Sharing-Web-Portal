
const path      = require('path');
const envPath   = path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
const fs        = require('fs');
const express   = require('express');
const mongoose  = require('mongoose');
const crypto    = require('crypto');
const Busboy    = require('busboy');
const multer    = require('multer');
const { v4: uuidv4 } = require('uuid');
const app       = express();

app.use(express.json());
// Resolve storage directory once so relative paths work regardless of CWD
const storageDir = path.resolve(__dirname, process.env.FILE_STORAGE || 'data');

// --- Mongo schema for transfer metadata ---
const transferSchema = new mongoose.Schema({
  transferId:   String,
  filename:     String,
  totalChunks:  Number,
  uploaded:     { type: Number, default: 0 },
  key:          Buffer,    // encryption key
  ivs:          [Buffer],  // store IV per chunk
  createdAt:    { type: Date, default: Date.now },
  status:       { type: String, enum: ['uploading','ready'], default: 'uploading' }
});
const Transfer = mongoose.model('Transfer', transferSchema);

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true })
  .then(()=> console.log('MongoDB connected'))
  .catch(err=> console.error(err));
// Multer setup for simple single-file uploads (client-side encrypted)
const storage = multer.diskStorage({
  destination: process.env.FILE_STORAGE,
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname) || '.enc';
    req.uploadId = id;
    req.uploadExt = ext;
    cb(null, `${id}${ext}`);
  }
});
const upload = multer({ storage });

// Simple upload endpoint expected by the React client
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Persist minimal metadata so the download route can locate the file
  const meta = {
    originalName: req.file.originalname,
    ext: req.uploadExt
  };
  fs.writeFileSync(
    path.join(process.env.FILE_STORAGE, `${req.uploadId}.json`),
    JSON.stringify(meta)
  );

  res.json({
    downloadCode: req.uploadId,
    downloadUrl: `/api/download/${req.uploadId}`
  });
});

// 1) Init upload
app.post('/api/upload/init', async (req, res) => {
  const { filename, totalChunks } = req.body;
  if (!filename || !totalChunks) {
    return res.status(400).json({ error: 'filename & totalChunks required' });
  }
  const transferId = uuidv4();
  const key = crypto.randomBytes(32); // AES-256 key
  const transfer = new Transfer({ transferId, filename, totalChunks, key, ivs: [] });
  await transfer.save();
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  res.json({
    transferId,
   uploadUrlTemplate: `${baseUrl}/api/upload/${transferId}/chunk/{index}`,
   downloadUrl:        `${baseUrl}/api/download/${transferId}?token=${transferId}`
  });
});

// 2) Upload chunk (index 0…totalChunks-1)
app.put('/api/upload/:transferId/chunk/:index', async (req, res) => {
  const { transferId, index } = req.params;
  const idx = parseInt(index, 10);
  const transfer = await Transfer.findOne({ transferId });
  if (!transfer || transfer.status !== 'uploading') {
    return res.status(404).json({ error: 'Invalid transfer' });
  }

  // Set up Busboy to read raw stream
  const busboy = new Busboy({ headers: req.headers });
  busboy.on('file', (_, fileStream) => {
    // Encrypt chunk on the fly
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', transfer.key, iv);
    const outPath = path.join(storageDir,
                              `${transferId}.chunk.${idx}.enc`);
    const writeStream = fs.createWriteStream(outPath);
    fileStream.pipe(cipher).pipe(writeStream);
    writeStream.on('finish', async () => {
      transfer.uploaded++;
      transfer.ivs[idx] = iv;
      // if last chunk, mark ready
      if (transfer.uploaded === transfer.totalChunks) {
        transfer.status = 'ready';
      }
      await transfer.save();
      res.json({ ok: true, idx });
    });
  });
  req.pipe(busboy);
});

// 3) Download endpoint
// First handle simple uploads stored with metadata
app.get('/api/download/:id', (req, res, next) => {
  const id = req.params.id;
  const metaPath = path.join(process.env.FILE_STORAGE, `${id}.json`);
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath));
      const filePath = path.join(process.env.FILE_STORAGE, `${id}${meta.ext}`);
      return res.download(filePath, meta.originalName);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to read file' });
    }
  }
  return next();
});

// Legacy chunked download (streams decrypted file)

app.get('/api/download/:transferId', async (req, res) => {
  const { transferId } = req.params;
  // Here we’re simply using transferId as token; in prod, sign this!
  const transfer = await Transfer.findOne({ transferId, status: 'ready' });
  if (!transfer) return res.status(404).send('Not found or not ready.');

  res.setHeader('Content-Disposition',
                `attachment; filename="${transfer.filename}"`);

  // Stream each chunk in order, decrypting
  (async () => {
    for (let i = 0; i < transfer.totalChunks; i++) {
      const iv = transfer.ivs[i];
      const decipher = crypto.createDecipheriv('aes-256-gcm', transfer.key, iv);
      const inPath = path.join(storageDir,
                               `${transferId}.chunk.${i}.enc`);
      // await pipeline of decryption to response
      await new Promise((resolve, reject) => {
        fs.createReadStream(inPath)
          .pipe(decipher)
          .on('data', (buf) => res.write(buf))
          .on('end', resolve)
          .on('error', reject);
      });
    }
    res.end();
  })().catch(err => res.status(500).json({ error: err.message }));
});

// Health check or root route
app.get('/', (req, res) => {
  res.send('SecDrop backend is running.');
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`SecDrop backend listening on ${port}`));
