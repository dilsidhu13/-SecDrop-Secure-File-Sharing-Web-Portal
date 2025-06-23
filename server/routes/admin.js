const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Dummy Admin Credentials (In practice, use a database)
const admin = {
  username: "admin",
  password: "hashedPasswordHere", // Replace with bcrypt hash
};

// Admin Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (username !== admin.username) return res.status(401).send("Invalid username.");

  const isPasswordCorrect = await bcrypt.compare(password, admin.password);
  if (!isPasswordCorrect) return res.status(401).send("Invalid password.");

  const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.status(200).send({ token });
});

module.exports = router;

