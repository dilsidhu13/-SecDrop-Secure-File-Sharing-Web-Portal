const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// Dummy admin credentials (In practice, use a database)
const admin = {
  username: "admin",
  password: bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10), // Hash the admin password
};

// Admin login
const loginAdmin = (req, res) => {
  const { username, password } = req.body;
  if (username !== admin.username) {
    return res.status(401).send("Invalid username.");
  }

  bcrypt.compare(password, admin.password, (err, result) => {
    if (!result) {
      return res.status(401).send("Invalid password.");
    }

    const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).send({ token });
  });
};

module.exports = { loginAdmin };

