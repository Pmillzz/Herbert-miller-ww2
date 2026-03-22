require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const searchRouter = require('./routes/search');
const boardRouter = require('./routes/board');
const facesRouter = require('./routes/faces');
const imageProxyRouter = require('./routes/imageProxy');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // reference face thumbnails are base64

// API routes
app.use('/api/search', searchRouter);
app.use('/api/board', boardRouter);
app.use('/api/faces', facesRouter);
app.use('/api/proxy-image', imageProxyRouter);

// Serve built React app in production
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (!process.env.EUROPEANA_API_KEY) {
    console.warn('⚠  EUROPEANA_API_KEY not set — Europeana searches will be disabled.');
  }
});
