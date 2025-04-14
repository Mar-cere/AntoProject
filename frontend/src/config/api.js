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

// API helper functions
export const api = {
  post: async (endpoint, data) => {
    try {
      console.log(`Iniciando petición a ${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();
      console.log(`Respuesta de ${endpoint}:`, responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Error en la petición');
      }

      return responseData;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  get: async (endpoint, params = {}) => {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = queryString ? `${API_URL}${endpoint}?${queryString}` : `${API_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  // Nuevo método para PUT
  put: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Error en la petición');
      }

      return responseData;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  // Nuevo método para DELETE
  delete: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error en la petición');
      }

      return data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  // Nuevo método para PATCH
  patch: async (endpoint, data) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Error en la petición');
      }

      return responseData;
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

export default api;