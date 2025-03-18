import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket = null;
let messageCallbacks = [];
let typingCallbacks = [];
let errorCallbacks = [];

const API_BASE_URL = 'https://antobackend.onrender.com';
// Inicializar la conexión WebSocket
export const initializeSocket = async () => {
  if (socket) return socket;
  
  console.log('Iniciando conexión Socket.IO a:', API_BASE_URL);
  
  socket = io(API_BASE_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    // Añadir logs para eventos de conexión
    autoConnect: true
  });
  
  socket.on('connect', () => {
    console.log('Socket conectado con ID:', socket.id);
  });
  
  socket.on('connect_error', (error) => {
    console.error('Error de conexión Socket.IO:', error);
  });
  
  // Autenticar el socket
  const userId = await AsyncStorage.getItem('userId') || 'usuario_prueba';
  console.log('Autenticando socket con userId:', userId);
  socket.emit('authenticate', { userId });
  
  // Configurar listeners con más logs
  socket.on('message:sent', (message) => {
    console.log('Mensaje enviado recibido del servidor:', message);
    messageCallbacks.forEach(callback => callback(message));
  });
  
  socket.on('message:received', (message) => {
    console.log('Mensaje de IA recibido del servidor:', message);
    messageCallbacks.forEach(callback => callback(message));
  });
  
  socket.on('ai:typing', (isTyping) => {
    console.log('Estado de escritura de IA:', isTyping);
    typingCallbacks.forEach(callback => callback(isTyping));
  });
  
  socket.on('error', (error) => {
    console.error('Error recibido del servidor:', error);
    errorCallbacks.forEach(callback => callback(error));
  });
  
  return socket;
};

// Enviar un mensaje
export const sendMessage = (text) => {
  if (!socket) {
    console.error('Socket no inicializado');
    throw new Error('Socket no inicializado');
  }
  
  if (!socket.connected) {
    console.error('Socket no conectado');
    throw new Error('Socket no conectado');
  }
  
  console.log('Enviando mensaje al servidor:', text);
  socket.emit('message', { text });
  
  return true; // Devolver true si se envió correctamente
};

// Cancelar la generación de respuesta
export const cancelResponse = () => {
  if (!socket || !socket.connected) return;
  
  socket.emit('cancel:response');
};

// Registrar callbacks
export const onMessage = (callback) => {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
};

export const onTyping = (callback) => {
  typingCallbacks.push(callback);
  return () => {
    typingCallbacks = typingCallbacks.filter(cb => cb !== callback);
  };
};

export const onError = (callback) => {
  errorCallbacks.push(callback);
  return () => {
    errorCallbacks = errorCallbacks.filter(cb => cb !== callback);
  };
};

// Cerrar la conexión
export const closeSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 