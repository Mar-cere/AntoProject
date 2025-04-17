import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../config/api';
import { Platform } from 'react';

const API_BASE_URL = 'https://antobackend.onrender.com';

// Mantener los callbacks para compatibilidad
let messageCallbacks = [];
let errorCallbacks = [];

// Función para manejar mensajes
const handleMessage = (message) => {
  messageCallbacks.forEach(callback => callback(message));
};

// Función para manejar errores
const handleError = (error) => {
  errorCallbacks.forEach(callback => callback(error));
};

// Inicializar el servicio
export const initializeSocket = async () => {
  try {
    console.log('Inicializando servicio de chat');
    
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    let conversationId = await AsyncStorage.getItem('currentConversationId');
    
    if (!conversationId) {
      conversationId = await createConversation();
    }
    
    console.log('Chat inicializado:', { conversationId });
    return true;
  } catch (error) {
    console.error('Error al inicializar chat:', error);
    return false;
  }
};

// Enviar un mensaje y obtener respuesta
export const sendMessage = async (text) => {
  try {
    console.log('Enviando mensaje:', text);
    
    // No necesitamos obtener userId porque el backend lo obtiene del token
    const conversationId = await AsyncStorage.getItem('currentConversationId') || 'default';

    // Crear mensaje con el formato correcto según el modelo y la ruta
    const userMessage = {
      content: text,
      role: 'user',
      conversationId: conversationId,
      type: 'text',
      metadata: {
        timestamp: new Date().toISOString(),
        device: Platform.OS
      }
    };

    console.log('Enviando mensaje al servidor:', userMessage);

    // Enviar mensaje al servidor
    const response = await api.post('/api/chat/messages', userMessage);
    console.log('Respuesta del servidor:', response);

    if (response) {
      handleMessage(response);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error detallado al enviar mensaje:', error);
    handleError(error);
    return false;
  }
};

// Registrar callbacks (mantener para compatibilidad)
export const onMessage = (callback) => {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
};

export const onError = (callback) => {
  errorCallbacks.push(callback);
  return () => {
    errorCallbacks = errorCallbacks.filter(cb => cb !== callback);
  };
};

// Función para guardar mensajes localmente
export const saveMessages = async (messages) => {
  try {
    await AsyncStorage.setItem('chatMessages', JSON.stringify(messages));
  } catch (error) {
    console.error('Error al guardar mensajes:', error);
    handleError(error);
  }
};

// Función para cargar mensajes
export const loadMessages = async () => {
  try {
    const savedMessages = await AsyncStorage.getItem('chatMessages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  } catch (error) {
    console.error('Error al cargar mensajes:', error);
    handleError(error);
    return [];
  }
};

// Función para limpiar mensajes
export const clearMessages = async () => {
  try {
    await AsyncStorage.removeItem('chatMessages');
    return true;
  } catch (error) {
    console.error('Error al limpiar mensajes:', error);
    handleError(error);
    return false;
  }
};

// Cerrar servicio (mantener para compatibilidad)
export const closeSocket = () => {
  console.log('Cerrando servicio de chat');
  messageCallbacks = [];
  errorCallbacks = [];
};

// Agregar función para crear una nueva conversación
export const createConversation = async () => {
  try {
    const response = await api.post('/api/chat/conversations', {
      metadata: {
        type: 'general',
        startedAt: new Date().toISOString(),
        platform: Platform.OS
      }
    });

    if (response && response.conversationId) {
      await AsyncStorage.setItem('currentConversationId', response.conversationId);
      return response.conversationId;
    }

    throw new Error('No se pudo crear la conversación');
  } catch (error) {
    console.error('Error al crear conversación:', error);
    throw error;
  }
};

// Agregar función para obtener mensajes
export const getMessages = async (conversationId) => {
  try {
    const response = await api.get(`/api/chat/conversations/${conversationId}`);
    return response.messages;
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    return [];
  }
};

export default {
  initializeSocket,
  sendMessage,
  onMessage,
  onError,
  saveMessages,
  loadMessages,
  clearMessages,
  closeSocket,
  getMessages
}; 