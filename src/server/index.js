const express = require('express');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const routes = require('./routes/index.js');
const { getLocalIPAddress } = require('./utils/functions.js');
const { CONFIG } = require('./utils/constants.js');

// this was added in the other github profile
// this other paragraph was also added during the work time
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Correlation ID middleware
const addCorrelationId = (req, res, next) => {
  req.correlationId = uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);
  next();
};
app.use(addCorrelationId);

app.use('/getAllFlashcards', routes);

app.use((req, res, next) => {
  res.status(404);
  const error = new Error('Not Found - ' + req.originalUrl);
  next(error);
})
app.use((err, req, res, next) => {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: err.stack
  });
});

const server = app.listen(CONFIG.PORT, () => {
  if (CONFIG.NODE_ENV === 'developer') {
    console.log(`Listening on http://${getLocalIPAddress()}:${CONFIG.PORT}`);
  }
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});