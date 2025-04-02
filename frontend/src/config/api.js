import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const API_URL = 'https://antobackend.onrender.com';

export const ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  HEALTH: '/api/health',
  
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

// Crear instancia de axios con configuración mejorada
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000, // Reducido a 10 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor de request mejorado
apiClient.interceptors.request.use(
  async (config) => {
    try {
      console.log('Realizando petición a:', config.url);
      
      // No añadir token para login, registro o health check
      const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/health'];
      if (!publicRoutes.includes(config.url)) {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      
      return config;
    } catch (error) {
      console.error('Error en interceptor de request:', error);
      return config;
    }
  },
  (error) => {
    console.error('Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor de respuesta mejorado
apiClient.interceptors.response.use(
  (response) => {
    console.log('Respuesta exitosa:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response.data;
  },
  async (error) => {
    console.error('Error en la petición:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('userToken');
      // Aquí podrías emitir un evento para manejar la sesión expirada
    }

    throw handleApiError(error);
  }
);

// Función mejorada para verificar la conexión
export const checkServerConnection = async () => {
  try {
    console.log('Verificando conexión con el servidor...');
    const response = await apiClient.get(ENDPOINTS.HEALTH);
    console.log('Servidor respondió:', response);
    return true;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    throw new Error('No se puede conectar con el servidor. Por favor, verifica tu conexión.');
  }
};

// API helper functions mejoradas
export const api = {
  get: async (endpoint) => {
    try {
      return await apiClient.get(endpoint);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  post: async (endpoint, data) => {
    try {
      return await apiClient.post(endpoint, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  put: async (endpoint, data) => {
    try {
      return await apiClient.put(endpoint, data);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async (endpoint) => {
    try {
      return await apiClient.delete(endpoint);
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Manejo de errores mejorado
export const handleApiError = (error) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }
    
    const status = error.response.status;
    const message = error.response.data?.message || 'Error desconocido';

    switch (status) {
      case 400:
        return new Error(`Error en la solicitud: ${message}`);
      case 401:
        return new Error('Sesión expirada o inválida. Por favor, inicia sesión nuevamente.');
      case 403:
        return new Error('No tienes permiso para realizar esta acción.');
      case 404:
        return new Error('Recurso no encontrado.');
      case 422:
        return new Error(`Datos inválidos: ${message}`);
      case 429:
        return new Error('Demasiadas peticiones. Por favor, espera un momento.');
      case 500:
        return new Error('Error en el servidor. Por favor, intenta más tarde.');
      default:
        return new Error(`Error: ${message}`);
    }
  }
  return error;
};

export default apiClient;