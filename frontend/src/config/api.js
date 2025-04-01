import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const fetchWithToken = async (endpoint, options = {}) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token && !endpoint.includes('login') && !endpoint.includes('register')) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    });

    // Log para debugging
    console.log(`API Call to ${endpoint}:`, response.status);

    if (!response.ok) {
      if (response.status === 401) {
        // Token expirado o inválido
        await AsyncStorage.removeItem('userToken');
        throw new Error('Sesión expirada');
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error en la petición');
    }

    return response.json();
  } catch (error) {
    console.error('Error en fetchWithToken:', error);
    throw error;
  }
};

export const handleApiError = (error) => {
  if (!error.response) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
  } else if (error.response.status === 401) {
    return 'Credenciales incorrectas. Por favor, verifica tu email y contraseña.';
  } else if (error.response.status === 404) {
    return 'El recurso solicitado no existe.';
  } else if (error.response.status >= 500) {
    return 'Error en el servidor. Por favor, intenta más tarde.';
  } else if (error.response.data && error.response.data.message) {
    return error.response.data.message;
  } else {
    return error.message || 'Ocurrió un error inesperado.';
  }
};

// Función helper para hacer peticiones más fácilmente
export const api = {
  get: (endpoint) => fetchWithToken(endpoint, { method: 'GET' }),
  
  post: (endpoint, data) => fetchWithToken(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  put: (endpoint, data) => fetchWithToken(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  delete: (endpoint) => fetchWithToken(endpoint, { method: 'DELETE' }),
};

// Función para verificar la conexión con el servidor
export const checkServerConnection = async () => {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Error verificando conexión:', error);
    return false;
  }
};