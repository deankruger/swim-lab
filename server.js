const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// API routes (scraping services - must be before static file serving)
const apiModule = require('./dist-server/server/api');
const apiRouter = apiModule.default;
app.use('/api', apiRouter);

const userRouter = require('./dist-server/server/userRouter').default;
app.use('/api/user', userRouter);

const notificationModule = require('./dist-server/server/services/SwimmerNotificationService');
if (typeof notificationModule.startSwimmerNotificationChecker === 'function') {
  notificationModule.startSwimmerNotificationChecker();
}

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
