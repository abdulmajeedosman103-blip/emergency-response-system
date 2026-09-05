// frontend/src/socket/socketClient.js
// Single shared Socket.IO connection for the whole application.
// The JWT is sent during connect; the server is the only authority on rooms.
import { io } from 'socket.io-client';
import { API_URL } from '../config';

let client = null;

export function connectSocket(token) {
  if (!client) {
    client = io(API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return client;
}

export function getSocket() {
  return client;
}

export function disconnectSocket() {
  if (client) {
    client.disconnect();
    client = null;
  }
}