import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Asegúrate de que esta URL sea correcta
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

// Configuración de axios mejorada
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Función para verificar la conexión
export const checkServerConnection = async () => {
  try {
    const response = await axios({
      method: 'get',
      url: `${API_URL}/health`,
      timeout: 5000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Health check response:', response.data);
    return true;
  } catch (error) {
    console.error('Health check error:', error);
    return false;
  }
};

// Interceptor de request simplificado
apiClient.interceptors.request.use(
  async (config) => {
    console.log(`Realizando petición ${config.method.toUpperCase()} a:`, config.url);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// API helper functions simplificadas
export const api = {
  post: async (endpoint, data) => {
    try {
      console.log(`Enviando petición a ${endpoint}:`, {
        ...data,
        password: data.password ? '***HIDDEN***' : undefined
      });
      
      const response = await axios({
        method: 'post',
        url: `${API_URL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      console.log(`Respuesta de ${endpoint}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`Error en ${endpoint}:`, {
        message: error.message,
        response: error.response?.data
      });
      throw handleApiError(error);
    }
  }
};

// Manejo de errores simplificado
export const handleApiError = (error) => {
  if (!error.response) {
    return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
  }
  
  const message = error.response.data?.message || error.message;
  return new Error(message);
};

export default apiClient;