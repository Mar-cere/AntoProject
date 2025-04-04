import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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

// Configuración base de axios
const axiosConfig = {
  timeout: 60000, // 60 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Función para verificar la conexión
export const checkServerConnection = async () => {
  try {
    console.log('Verificando conexión con el servidor...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error de servidor: ${response.status}`);
    }

    const data = await response.json();
    console.log('Health check respuesta:', data);
    
    return true;
  } catch (error) {
    console.error('Error en health check:', {
      message: error.message,
      name: error.name
    });
    return false;
  }
};

// API helper functions
export const api = {
  post: async (endpoint, data) => {
    console.log(`Iniciando petición POST a ${endpoint}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();
      console.log(`Respuesta recibida de ${endpoint}:`, responseData);

      if (!response.ok) {
        throw new Error(responseData.message || `Error ${response.status}`);
      }

      return responseData;
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, {
        message: error.message,
        name: error.name,
        type: error.type
      });

      if (error.name === 'AbortError') {
        throw new Error('La petición tardó demasiado tiempo. Por favor, intenta de nuevo.');
      }

      throw error;
    }
  },

  get: async (endpoint) => {
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
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
      console.error(`Error en GET ${endpoint}:`, error);
      throw new Error(error.message || 'Error de conexión');
    }
  }
};

export default api;