import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// Asegúrate de que esta URL sea correcta
export const API_URL = 'https://antobackend.onrender.com';

export const ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  HEALTH: '/health', // Cambiado a /health directamente
  
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

// Configuración mejorada de axios
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Aumentado a 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // Añadir estas opciones para mejorar la conectividad
  withCredentials: true,
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Aceptar todos los códigos de estado entre 200-499
  }
});

// Interceptor de request mejorado
apiClient.interceptors.request.use(
  async (config) => {
    try {
      console.log(`Realizando petición ${config.method.toUpperCase()} a:`, config.url);
      console.log('Headers:', config.headers);
      
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
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

// Interceptor de respuesta mejorado
apiClient.interceptors.response.use(
  (response) => {
    console.log(`Respuesta exitosa de ${response.config.url}:`, {
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
      message: error.message,
      code: error.code
    });

    // Manejar errores específicos
    if (error.code === 'ECONNABORTED') {
      throw new Error('La conexión tardó demasiado tiempo. Por favor, intenta de nuevo.');
    }

    if (!error.response) {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    }

    throw error;
  }
);

// Función mejorada para verificar la conexión
export const checkServerConnection = async () => {
  try {
    console.log('Verificando conexión con el servidor...');
    const response = await fetch(`${API_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Error de servidor: ${response.status}`);
    }

    const data = await response.json();
    console.log('Servidor respondió:', data);
    return true;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};

// API helper functions mejoradas
export const api = {
  get: async (endpoint, config = {}) => {
    try {
      return await apiClient.get(endpoint, config);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  post: async (endpoint, data = {}, config = {}) => {
    try {
      return await apiClient.post(endpoint, data, config);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  put: async (endpoint, data = {}, config = {}) => {
    try {
      return await apiClient.put(endpoint, data, config);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  delete: async (endpoint, config = {}) => {
    try {
      return await apiClient.delete(endpoint, config);
    } catch (error) {
      throw handleApiError(error);
    }
  }
};

// Manejo de errores mejorado
export const handleApiError = (error) => {
  if (axios.isAxiosError(error)) {
    const errorMessage = error.response?.data?.message || error.message;
    
    switch (error.code) {
      case 'ECONNABORTED':
        return new Error('La conexión tardó demasiado tiempo. Por favor, intenta de nuevo.');
      case 'ERR_NETWORK':
        return new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      default:
        if (!error.response) {
          return new Error('Error de conexión. Verifica tu conexión a internet.');
        }
        
        switch (error.response.status) {
          case 400:
            return new Error(`Error en la solicitud: ${errorMessage}`);
          case 401:
            return new Error('Sesión expirada o inválida. Por favor, inicia sesión nuevamente.');
          case 403:
            return new Error('No tienes permiso para realizar esta acción.');
          case 404:
            return new Error('Recurso no encontrado.');
          case 422:
            return new Error(`Datos inválidos: ${errorMessage}`);
          case 429:
            return new Error('Demasiadas peticiones. Por favor, espera un momento.');
          case 500:
            return new Error('Error en el servidor. Por favor, intenta más tarde.');
          default:
            return new Error(`Error: ${errorMessage}`);
        }
    }
  }
  return error;
};

export default apiClient;