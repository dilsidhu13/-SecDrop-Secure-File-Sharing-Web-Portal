// server/server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const dontenv= require('dontenv');
const fileroutes = require('./routes/files');
const adminroutes= require('./routes/admin');

dontenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("uploads"));
app.use('/api/files', fileroutes);
app.use('/api/admin', adminroutes);


app.get('/', (req, res) => res.send('SecDrop backend is running!'));

app.listen(5000, () => console.log('Backend running on http://localhost:5000'));
