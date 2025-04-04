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
    console.log('Verificando conexión con:', `${API_URL}/health`);
    
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Health check respuesta:', data);
    return true;
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
};

// API helper functions
export const api = {
  post: async (endpoint, data) => {
    try {
      console.log(`Iniciando petición POST a ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
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

      console.log(`Respuesta exitosa de ${endpoint}:`, responseData);
      return responseData;
    } catch (error) {
      console.error(`Error en petición a ${endpoint}:`, error);
      throw new Error(error.message || 'Error de conexión');
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