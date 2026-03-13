const express = require('express');
const {createProxyMiddleware} = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Proxy API requests to the target server
app.use('/swimresults', createProxyMiddleware({
  target: 'https://www.swimmingresults.org',
  changeOrigin: true,
  on: {
    proxyReq: (proxyReq, req) => {
      console.log(`[proxy] ${req.method} ${req.url} → ${proxyReq.path}`);
    },
    proxyRes: (proxyRes, req) => {
      console.log(`[proxy] ${proxyRes.statusCode} ← ${req.url}`);
    },
    error: (err, req, res) => {
      console.log(`[proxy] error on ${req.url}:`, err.message);
      res.status(502).send('Proxy error: ', err.message);
    }
  }
}));

// Serve static files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

// For any other requests, serve the index.html file (SPA Fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});