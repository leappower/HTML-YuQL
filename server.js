const express = require('express');
const compression = require('compression');
const path = require('path');

const app = express();
app.use(compression());

// Simple caching middleware:
app.use((req, res, next) => {
  // Avoid caching the main HTML entry so updates appear quickly
  if (req.path === '/' || req.path === '/index.html') {
    res.setHeader('Cache-Control', 'no-cache, private, max-age=0, must-revalidate');
  } else {
    // Static assets: long-term cache + immutable
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  next();
});

app.use(express.static(path.join(__dirname), {
  etag: true,
  lastModified: true,
}));

// Fallback to index.html for unknown routes (useful for SPAs)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Static server with caching running on http://localhost:${PORT}`);
});
