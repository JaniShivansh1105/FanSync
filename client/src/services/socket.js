// ──────────────────────────────────────────────────────────
// FanSync — Socket.io Client Service
// Singleton socket connection with auto-reconnect
// ──────────────────────────────────────────────────────────

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
