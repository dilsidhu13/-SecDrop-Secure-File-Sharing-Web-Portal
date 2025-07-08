// server/ec2Storage.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { PassThrough } = require('stream');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.AWS_S3_BUCKET;

// Upload a local file to S3 under the given key
async function uploadToS3(localPath, key) {
  const fs = require('fs');
  const fileStream = fs.createReadStream(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileStream,
  }));
}

// Return a readable stream for the object at `key`
function downloadFromS3(key) {
  const pass = new PassThrough();
  s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    .then(res => res.Body.pipe(pass))
    .catch(err => pass.emit('error', err));
  return pass;
}

module.exports = { uploadToS3, downloadFromS3 };
