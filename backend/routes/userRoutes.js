import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import User from '../models/User';

// URL base de la API
const API_BASE_URL = 'https://antobackend.onrender.com';

// Rutas de navegación
export const ROUTES = {
  SIGN_IN: 'SignIn',
  REGISTER: 'Register',
  RECOVER_PASSWORD: 'RecoverPassword',
  VERIFY_CODE: 'VerifyCode',
  NEW_PASSWORD: 'NewPassword',
  DASHBOARD: 'Dash',
  CHAT: 'Chat',
  PROFILE: 'Profile',
  SETTINGS: 'Settings'
};

// Endpoints de la API
const ENDPOINTS = {
  LOGIN: '/api/users/login',
  REGISTER: '/api/users/register',
  RECOVER: '/api/users/recover',
  VERIFY_CODE: '/api/users/verify-code',
  RESET_PASSWORD: '/api/users/reset-password'
};

// Servicio de autenticación
const userService = {
  // Iniciar sesión
  login: async (email, password) => {
    try {
      // Convertir email a minúsculas
      const normalizedEmail = email.toLowerCase().trim();
      
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.LOGIN}`, {
        email: normalizedEmail,
        password
      });
      
      // Guardar token en localStorage o AsyncStorage
      if (response.data && response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
        
        // Si la API devuelve los datos del usuario, crear instancia
        if (response.data.user) {
          const user = new User(response.data.user);
          await AsyncStorage.setItem('userData', JSON.stringify(user));
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  // Registrar nuevo usuario
  register: async (userData) => {
    try {
      // Validar datos de entrada
      if (!userData.email || !userData.password) {
        throw new Error('El correo y la contraseña son obligatorios');
      }

      // Normalizar email a minúsculas
      const normalizedEmail = userData.email.toLowerCase().trim();

      // Crear objeto de datos para la API
      const registerData = {
        name: userData.name || '',
        email: normalizedEmail,
        password: userData.password
      };

      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.REGISTER}`, registerData);
      return response.data;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  },

  // Método mejorado de recuperación de contraseña
  recoverPassword: async (email) => {
    try {
      // Normalizar email a minúsculas
      const normalizedEmail = email.toLowerCase().trim();
      
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.RECOVER}`, {
        email: normalizedEmail
      });
      
      return response.data;
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      throw error;
    }
  },

  // Método para verificar código de recuperación
  verifyCode: async (email, code) => {
    try {
      // Normalizar email a minúsculas
      const normalizedEmail = email.toLowerCase().trim();
      
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.VERIFY_CODE}`, {
        email: normalizedEmail,
        code
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al verificar código:', error);
      throw error;
    }
  },

  // Método para establecer nueva contraseña con código
  resetPassword: async (email, code, newPassword) => {
    try {
      // Normalizar email a minúsculas
      const normalizedEmail = email.toLowerCase().trim();
      
      const response = await axios.post(`${API_BASE_URL}${ENDPOINTS.RESET_PASSWORD}`, {
        email: normalizedEmail,
        code,
        password: newPassword
      });
      
      return response.data;
    } catch (error) {
      console.error('Error al establecer nueva contraseña:', error);
      throw error;
    }
  },

  // Cerrar sesión
  logout: async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      return { success: true };
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  },

  isAuthenticated: async () => {
    try {
      // Simplemente verificamos si hay un token, pero no lo usamos para autenticación automática
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      // Aquí podríamos verificar la validez del token con el backend
      // pero por ahora simplemente registramos que existe sin autenticar automáticamente
      if (token && userData) {
        console.log('Existe un token previo, pero se requiere contraseña');
      }
      
      // Siempre retornamos false para forzar el flujo de inicio de sesión
      return false;
    } catch (error) {
      console.error('Error al verificar autenticación:', error);
      return false;
    }
  },
  
  // Obtener usuario actual
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return null;
      
      return User.fromJSON(userData);
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
    }
  }
};

// Función auxiliar para manejar errores de red
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

export default userService;