const express = require('express');
const multer = require('multer'); // used for uploading files
//const {uploadfile, downloadfile} =require('../encryptdecrpyt/filesencrpytdecrpyt');
const { uploadFile, downloadFile} = require('../encryptdecrpyt/filesencryptdecrypt'); //importing the functions from filesencryptdecrypt.js
//for better organization
const router = express.Router();
const upload = multer({ dest: 'uploads/' });

//defining routes
router.post('/upload', upload.single('file'), uploadFile);
router.post('/decrypt/:id', downloadFile);
module.exports=router;


