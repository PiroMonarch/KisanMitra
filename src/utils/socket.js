import { io } from 'socket.io-client';
import { API_BASE } from './api.js';

let socketInstance = null;

export const getSocket = () => {
  if (socketInstance) return socketInstance;
  const token = localStorage.getItem('kisanmitr_token');
  socketInstance = io(API_BASE, {
    auth: { token },
    transports: ['websocket']
  });
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
