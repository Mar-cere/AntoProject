import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkServerStatus } from '../utils/networkUtils';
import { Platform } from 'react-native';

// Detectar si estamos en simulador
const isSimulator = Platform.OS === 'ios' && Platform.isPad === undefined && !Platform.isTVOS;

// Asegúrate de que esta URL sea exactamente la misma que tu servidor
export const API_URL = isSimulator 
  ? 'http://localhost:5001'  // URL local para simulador
  : 'https://antobackend.onrender.com'; // URL de producción para dispositivos reales

console.log('Usando API_URL:', API_URL);

export const ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  HEALTH: '/health',
  
  // Users
  ME: '/api/users/me',
  PROFILE: '/api/users/me',
  UPDATE_PROFILE: '/api/users/me',
  
  // Tareas
  TASKS: '/api/tasks',
  TASK_BY_ID: (id) => `/api/tasks/${id}`,
  
  // Hábitos
  HABITS: '/api/habits',
  HABIT_BY_ID: (id) => `/api/habits/${id}`,
  HABIT_COMPLETE: (id) => `/api/habits/${id}/complete`,

  // Journal (Nuevo)
  JOURNAL: '/api/journal',
  JOURNAL_BY_ID: (id) => `/api/journal/${id}`,
  JOURNAL_MOOD_SUMMARY: '/api/journal/mood-summary',
  JOURNAL_BY_TAGS: '/api/journal/by-tags',
  JOURNAL_PRIVACY: (id) => `/api/journal/${id}/privacy`,

  // Chat
  CHAT: '/api/chat',
  CHAT_MESSAGES: '/api/chat/messages',
  CHAT_CONVERSATIONS: '/api/chat/conversations',
  CHAT_CONVERSATION_BY_ID: (id) => `/api/chat/conversations/${id}`,
  CHAT_MESSAGE_STATUS: '/api/chat/messages/status',
  CHAT_SEARCH: '/api/chat/messages/search',
};

const makeRequest = (url, options) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.timeout = 15000;

    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (e) {
          reject(new Error('Error parsing response'));
        }
      } else {
        reject(new Error(xhr.statusText || 'Request failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network request failed'));
    xhr.ontimeout = () => reject(new Error('Request timed out'));

    xhr.open(options.method, url);
    
    Object.keys(options.headers).forEach(key => {
      xhr.setRequestHeader(key, options.headers[key]);
    });

    xhr.send(options.body);
  });
};

// Función auxiliar para obtener headers con autorización
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// API helper functions
export const api = {
  post: async (endpoint, data) => {
    try {
      console.log(`Iniciando petición a ${endpoint}`);
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición');
      }

      const responseData = await response.json();
      console.log(`Respuesta de ${endpoint}:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  get: async (endpoint, params = {}) => {
    try {
      const headers = await getAuthHeaders();
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_URL}${endpoint}?${queryString}` : `${API_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  put: async (endpoint, data) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  delete: async (endpoint) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  patch: async (endpoint, data) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error en la petición');
      }

      return await response.json();
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  }
};

export const checkServerConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    return data.status === 'ok';
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};

export const login = async (credentials) => {
  try {
    console.log('Iniciando login con:', credentials);
    
    // Usar el helper api.post en lugar de fetch directamente
    const data = await api.post(ENDPOINTS.LOGIN, credentials);
    console.log('Respuesta del servidor:', data);

    if (data.token && data.user) {
      // Guardar el token
      await AsyncStorage.setItem('userToken', data.token);
      
      // Guardar los datos del usuario completos
      await AsyncStorage.setItem('userData', JSON.stringify(data.user));
      
      console.log('Datos guardados exitosamente');
      console.log('Token guardado:', data.token);
      console.log('Usuario guardado:', data.user);

      return {
        success: true,
        data: {
          token: data.token,
          user: data.user
        }
      };
    } else {
      throw new Error('Respuesta del servidor incompleta');
    }
  } catch (error) {
    console.error('Error en login:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
    return { success: true };
  } catch (error) {
    console.error('Error en logout:', error);
    return { success: false, error: error.message };
  }
};

// Función para verificar el estado de autenticación
export const checkAuthStatus = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userData = await AsyncStorage.getItem('userData');
    
    console.log('Token almacenado:', token);
    console.log('Datos de usuario almacenados:', userData);
    
    if (token && userData) {
      return {
        isAuthenticated: true,
        user: JSON.parse(userData),
        token
      };
    }
    
    return { isAuthenticated: false };
  } catch (error) {
    console.error('Error verificando autenticación:', error);
    return { isAuthenticated: false };
  }
};

// También sería útil tener una función para verificar los datos guardados
const checkStoredData = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const userData = await AsyncStorage.getItem('userData');
    console.log('Token almacenado:', token);
    console.log('UserData almacenado:', userData);
    return { token, userData };
  } catch (error) {
    console.error('Error checking stored data:', error);
    return { token: null, userData: null };
  }
};

export default api;