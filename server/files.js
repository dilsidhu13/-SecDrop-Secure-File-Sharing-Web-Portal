const { listAllUploads } = require('./ec2');

app.get('/api/uploads', (req, res) => {
  const data = listAllUploads();
  res.json(data);
});
