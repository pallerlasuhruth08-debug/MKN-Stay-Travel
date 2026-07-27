const path = require('path');
const express = require('express');

const requestsRouter = require('./routes/requests');
const trainsRouter = require('./routes/trains');
const flightsRouter = require('./routes/flights');
const { requestLogger, notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(requestLogger);

app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/requests', requestsRouter);
app.use('/api/trains', trainsRouter);
app.use('/api/flights', flightsRouter);

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;
