const fs = require('fs');
const path = require('path');

// Persistent metadata path
const metadataPath = path.join(__dirname, 'uploads.json');

// Load or initialize metadata
let uploads = {};
if (fs.existsSync(metadataPath)) {
  try {
    uploads = JSON.parse(fs.readFileSync(metadataPath));
  } catch (err) {
    console.error('[⚠️ uploads.json] Failed to parse:', err);
  }
}

// Save metadata helper
function saveMetadata() {
  fs.writeFileSync(metadataPath, JSON.stringify(uploads, null, 2));
}

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const s3 = new S3Client({ region: process.env.AWS_REGION });

const uploadToS3 = async (id, fileBuffer) => {
  const s3Key = `encrypted/${id}.enc`;
  await s3.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: 'application/octet-stream',
  }));
  return s3Key;
};

const downloadFromS3 = async (s3Key) => {
  const data = await s3.send(new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: s3Key,
  }));
  return data.Body;
};

module.exports = { uploadToS3, downloadFromS3 };
