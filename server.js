const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

//// Force HTTPS on Azure (X-Forwarded-Proto is set by Azure's front-end)
//app.use((req, res, next) => {
//  if (req.headers['x-forwarded-proto'] === 'http') {
//    return res.redirect(301, `https://${req.headers.host}${req.url}`);
//  }
//  next();
//});

const cors = require('cors');
app.use(cors({ origin: 'http://swim-lab.azurewebsites.net' }));

// API routes (scraping services - must be before static file serving)
const apiRouter = require('./dist-server/server/api').default;
app.use('/api', apiRouter);

// Serve built static files
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
