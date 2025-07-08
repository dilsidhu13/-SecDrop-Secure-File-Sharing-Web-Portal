const { listAllUploads } = require('./ec2Storage');

app.get('/api/uploads', (req, res) => {
  const data = listAllUploads();
  res.json(data);
});
