const express = require("express");
const { loginAdmin } = require("../encryptdecrypt/adminencryptdecrypt");

const router = express.Router();

// Routes
router.post("/login", loginAdmin);

module.exports = router;
