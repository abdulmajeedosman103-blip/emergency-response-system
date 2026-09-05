// frontend/src/socket/socketContext.jsx
// Provides one authenticated socket plus a small event-subscription hook.
// The socket connects once the user is authenticated and disconnects on logout.
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getToken } from '../api/client';
import { useAuth } from '../auth/authContext';
import { connectSocket, disconnectSocket } from './socketClient';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      setClient(null);
      setConnected(false);
      return undefined;
    }

    const token = getToken();
    const socket = connectSocket(token);
    setClient(socket);

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    setConnected(socket.connected);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ client, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

// Attaches a listener to the shared socket for the lifetime of the component.
export function useSocketEvent(event, handler) {
  const { client } = useSocket();
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!client) {
      return undefined;
    }
    const listener = (payload) => handlerRef.current(payload);
    client.on(event, listener);
    return () => {
      client.off(event, listener);
    };
  }, [client, event]);
}