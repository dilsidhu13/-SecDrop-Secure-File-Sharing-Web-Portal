const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017')
  .then(() => {
    console.log('✅ MongoDB is reachable');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed', err);
    process.exit(1);
  });