const express = require('express');
const multer = require('multer'); // used for uploading files
const { uploadFile, downloadFile } = require('../encryptdecrpyt/filesencryptdecrypt');

//for better organization
const router = express.Router();
const upload = multer({ dest: 'uploads/' });
 

//defining routes
router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:filename', downloadFile);
module.exports=router;


