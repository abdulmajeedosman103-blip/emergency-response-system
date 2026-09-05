// backend/src/server.js
// Entry point — starts the HTTP server (and Socket.IO) and handles graceful shutdown.
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { initializeSocket, getIO } = require('./sockets/socket');

const server = app.listen(env.port, () => {
  console.log(`[server] API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

// Attach the real-time layer to the same HTTP server.
const io = initializeSocket(server);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${env.port} is already in use.`);
  } else {
    console.error('[server] Failed to start:', err);
  }
  process.exit(1);
});

async function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down gracefully...`);

  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();

  const finish = async () => {
    try {
      await prisma.$disconnect();
      console.log('[server] Prisma client disconnected. Goodbye.');
      process.exit(0);
    } catch (err) {
      console.error('[server] Error during shutdown:', err);
      process.exit(1);
    }
  };

  if (getIO()) {
    // Close the real-time layer first so open socket connections release the
    // HTTP server, then finish shutdown.
    getIO().close(() => finish());
  } else {
    server.close(finish);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', reason);
  process.exit(1);
});