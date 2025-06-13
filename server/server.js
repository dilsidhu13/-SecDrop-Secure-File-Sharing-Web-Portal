// server/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('SecDrop backend is running!'));

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
