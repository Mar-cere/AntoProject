import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkServerStatus } from '../utils/networkUtils';

// Asegúrate de que esta URL sea exactamente la misma que tu servidor
export const API_URL = 'https://antobackend.onrender.com';

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
      const isServerAvailable = await checkServerStatus();
      if (!isServerAvailable) {
        throw new Error('El servidor no está disponible en este momento');
      }

      console.log(`Iniciando petición a ${endpoint}`);
      
      const response = await makeRequest(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      console.log(`Respuesta de ${endpoint}:`, response);
      return response;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, error);
      throw error;
    }
  },

  get: async (endpoint) => {
    try {
      const response = await makeRequest(`${API_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      return response;
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