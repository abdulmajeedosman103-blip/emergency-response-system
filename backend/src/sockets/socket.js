// backend/src/sockets/socket.js
// Centralized Socket.IO configuration.
//
// * initializeSocket(httpServer) attaches a Socket.IO server to the existing
//   HTTP server (CORS mirrors the REST client origin).
// * Connections are authenticated with the existing JWT utility
//   (verifyToken from utils/jwt.js) — never a client-supplied user id.
// * Room membership (user:<id>, role:<ROLE>) is decided server-side only.
//   There is no handler that lets a client join or create rooms.
// * Services emit via emitToUser / emitToRole (safe when uninitialized).
const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyToken } = require('../utils/jwt');

let io = null;

function initializeSocket(server) {
  io = new Server(server, {
    cors: { origin: env.clientOrigin },
  });

  // Authentication middleware — rejects before the connection is established.
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required.'));
    }
    try {
      const payload = verifyToken(token);
      if (!payload || typeof payload.sub !== 'string' || typeof payload.role !== 'string') {
        return next(new Error('Invalid token.'));
      }
      socket.user = { id: payload.sub, role: payload.role };
      return next();
    } catch (err) {
      const message = err.message === 'Access token has expired.' ? 'Token expired.' : 'Invalid token.';
      return next(new Error(message));
    }
  });

  io.on('connection', (socket) => {
    // Server-controlled rooms derived from the verified JWT payload.
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.role}`);
    socket.emit('socket:authenticated', { userId: socket.user.id, role: socket.user.role });
  });

  return io;
}

function getIO() {
  return io;
}

function emitToUser(userId, event, payload) {
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }
}

function emitToRole(role, event, payload) {
  if (io && role) {
    io.to(`role:${role}`).emit(event, payload);
  }
}

module.exports = { initializeSocket, getIO, emitToUser, emitToRole };