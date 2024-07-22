const express = require('express')
const app = express()
const port = 3000

app.get('/example', (req, res)=>{
    console.log('here 1');
    res.json({data: 'hearla'})
})
app.get('*', (req, res) => {
    console.log(req);
    res.json({data: 'hearla'})
  });

function errorHandler(err, req, res, next) {
    res.status(res.statusCode || 500);
    res.json({
      message: err.message,
      stack: err.stack
    });
  }
  
  app.use(errorHandler);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})