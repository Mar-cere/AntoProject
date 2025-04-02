import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export const API_URL = 'https://antobackend.onrender.com';

export const ENDPOINTS = {
  // Usuarios
  LOGIN: '/api/users/login',
  REGISTER: '/api/users/register',
  RECOVER: '/api/users/recover',
  VERIFY_CODE: '/api/users/verify-code',
  RESET_PASSWORD: '/api/users/reset-password',
  ME: '/api/users/me',
  
  // Tareas
  TASKS: '/api/tasks',
  TASK_BY_ID: (id) => `/api/tasks/${id}`,
  
  // Hábitos
  HABITS: '/api/habits',
  HABIT_BY_ID: (id) => `/api/habits/${id}`,
  HABIT_COMPLETE: (id) => `/api/habits/${id}/complete`,
  
  // Perfil
  PROFILE: '/api/users/profile',
  UPDATE_PROFILE: '/api/users/profile/update'
};

// Crear instancia de axios
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Interceptor para agregar el token a las peticiones
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token && !config.url.includes('login') && !config.url.includes('register')) {
        config.headers.Authorization = `Bearer ${token}`;
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

// Interceptor para manejar respuestas y errores
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    console.log('Error en la petición:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      // Token expirado o inválido
      await AsyncStorage.removeItem('userToken');
      // Aquí podrías disparar una acción para redireccionar al login
    }

    throw error;
  }
);

// API helper functions
export const api = {
  get: async (endpoint) => {
    try {
      const response = await apiClient.get(endpoint);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  post: async (endpoint, data) => {
    try {
      const response = await apiClient.post(endpoint, data);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  put: async (endpoint, data) => {
    try {
      const response = await apiClient.put(endpoint, data);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async (endpoint) => {
    try {
      const response = await apiClient.delete(endpoint);
      return response;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Función para manejar errores de API
export const handleApiError = (error) => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return new Error('Error de conexión. Verifica tu conexión a internet.');
    }
    
    const status = error.response.status;
    const message = error.response.data?.message;

    switch (status) {
      case 401:
        return new Error(message || 'No autorizado. Por favor, inicia sesión nuevamente.');
      case 403:
        return new Error(message || 'No tienes permiso para realizar esta acción.');
      case 404:
        return new Error(message || 'Recurso no encontrado.');
      case 422:
        return new Error(message || 'Datos inválidos.');
      case 500:
        return new Error(message || 'Error en el servidor. Por favor, intenta más tarde.');
      default:
        return new Error(message || 'Ocurrió un error inesperado.');
    }
  }
  return error;
};

// Función para verificar la conexión con el servidor
export const checkServerConnection = async () => {
  try {
    const response = await apiClient.get('/health');
    return true;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};

export default apiClient;