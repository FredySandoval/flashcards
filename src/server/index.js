const express = require('express');
const path = require('path');

const routes = require('./routes/index.js');
const { getLocalIPAddress } = require('./routes/functions.js');
const { CONFIG } = require('./routes/constants.js');


const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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