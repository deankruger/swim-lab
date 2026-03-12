const express = require('express');
const {createProxyMiddleware} = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Proxy API requests to the target server
app.use('/swimresults', createProxyMiddleware({
  target: 'https://www.swimingresults.org',
 changeOrigin: true, 
 pathRewrite: { '^/swimresults': '' },
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