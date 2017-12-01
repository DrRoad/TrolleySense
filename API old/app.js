"use strict";

// Import external libraries
const express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cors = require("cors"),
    bodyParser = require('body-parser');//,

// Import database and route controlers
const database = require('./config/dbconnection'),
    stats = require('./routes/stats'),
    log = require('./routes/log'),
    stop = require('./routes/stop'),
    trolley = require('./routes/trolley');
//    session = require('./routes/session');

// Setup server and get our request parameters
let app = express();
app.options('*', cors()); 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); // uncomment after placing your favicon in /public

// Enable log to console
app.use(logger('dev'));

// Prepare authentication.
process.env.SECRET_KEY = "BZxtfkhc4XutFRNga8aPMrgIM0P2gh4yNE9HVERmbYUlHXdfUQrlZXTSGIqM0XwHeEz0C0OpkvwkfPyRpa2iF0vhoE8ETNtHvl2Q5BUri8ivEafOO6rsGVUSR0nxtm47wCUEZ4c9aUDy7eseoPej75coMyPfjrU33my2kRdSC5ADLLNfkz3ZWoth8K1paQcg02ab1pSEAKpQzRtEzWFW4Eez2G09RpyMexsCxDF4U4iJ7qsOfyIbAzXOURE7jTqs";

// Use Routes
app.use('/stats', stats);
app.use('/log', log);
app.use('/stop', stop);
app.use('/trolley', trolley);
app.get('/', function (err, req, res, next) {
 res.status(200).send('The API is up.');
});

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(res.locals.error);
  //res.render('error');
  return res.send('Not Found');
});

module.exports = app;
