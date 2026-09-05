// backend/src/app.js
// Express application factory — mounts middleware, routes, and error handling.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const prisma = require('./config/prisma');
const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const operatorRoutes = require('./routes/operator');
const responderRoutes = require('./routes/responder');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.disable('x-powered-by');

app.use(helmet());
app.use(cors({ origin: env.clientOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
  const startedAt = Date.now();
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT current_database() AS db');
    res.status(200).json({
      status: 'ok',
      service: 'emergency-response-system-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        name: rows[0].db,
        latencyMs: Date.now() - startedAt,
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      service: 'emergency-response-system-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'disconnected',
        message: err.message,
      },
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/responder', responderRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;