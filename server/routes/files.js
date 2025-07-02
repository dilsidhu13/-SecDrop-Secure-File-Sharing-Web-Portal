const express = require('express');
const multer = require('multer'); // used for uploading files
//const {uploadfile, downloadfile} =require('../encryptdecrpyt/filesencrpytdecrpyt');
const {uploadfile, downloadfile} = require('../encryptdecrpyt/filesencryptdecrypt'); //importing the functions from filesencryptdecrypt.js
//for better organization
const router = express.Router();
const upload = multer({dest:"uploads/"}); 

//defining routes
router.post('/upload'. upload.single('file'), uploadfile);
router.get('/download/:filename', downloadfile);
module.exports=router;


