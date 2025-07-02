require('dotenv').config();
const path      = require('path');
const fs        = require('fs');
const express   = require('express');
const mongoose  = require('mongoose');
const crypto    = require('crypto');
const Busboy    = require('busboy');
const { v4: uuidv4 } = require('uuid');
const app       = express();

app.use(express.json());

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

// Helper: ensure storage dir
if (!fs.existsSync(process.env.FILE_STORAGE)) {
  fs.mkdirSync(process.env.FILE_STORAGE, { recursive: true });
}

// Convenience endpoint for simple uploads used by the older client
app.post('/api/upload', (req, res) => {
  const busboy = Busboy({ headers: req.headers }); // FIX: remove 'new'
  const transferId = uuidv4();
  const key = crypto.randomBytes(32); // server-side encryption key
  const iv = crypto.randomBytes(12);
  let filename = 'upload.bin';

  busboy.on('file', (_, fileStream, name) => {
    if (name) filename = name;
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const outPath = path.join(process.env.FILE_STORAGE,
                              `${transferId}.chunk.0.enc`);
    const writeStream = fs.createWriteStream(outPath);
    fileStream.pipe(cipher).pipe(writeStream);
    writeStream.on('finish', async () => {
      const transfer = new Transfer({
        transferId,
        filename,
        totalChunks: 1,
        uploaded: 1,
        key,
        ivs: [iv],
        status: 'ready'
      });
      await transfer.save();
      res.json({
        downloadCode: transferId,
        downloadUrl: `/api/download/${transferId}?token=${transferId}`
      });
    });
    writeStream.on('error', err => {
      res.status(500).json({ error: err.message });
    });
  });

  req.pipe(busboy);
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

  res.json({
    transferId,
    uploadUrlTemplate: `/api/upload/${transferId}/chunk/{index}`,
    downloadUrl:        `/api/download/${transferId}?token=${transferId}`
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
  const busboy = Busboy({ headers: req.headers }); // FIX: remove 'new'
  busboy.on('file', (_, fileStream) => {
    // Encrypt chunk on the fly
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', transfer.key, iv);
    const outPath = path.join(process.env.FILE_STORAGE,
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

// 3) Download (streams decrypted file)
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
      const inPath = path.join(process.env.FILE_STORAGE,
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
