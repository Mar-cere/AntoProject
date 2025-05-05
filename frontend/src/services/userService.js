import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { User } from '../models/User';
import { API_URL, ENDPOINTS, fetchWithToken } from '../config/api';

// URL base de la API
export const API_BASE_URL = 'https://antobackend.onrender.com';

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

// Crear cliente axios con interceptores
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de red
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (!error.response) {
      console.error('Error de conexión:', {
        message: error.message,
        code: error.code,
        config: error.config
      });
    }
    return Promise.reject(error);
  }
);

/**
 * Servicio para gestionar usuarios
 */
export const userService = {
  /**
   * Obtiene el usuario actual desde el almacenamiento local
   * @returns {Promise<User|null>} Usuario actual o null
   */
  getCurrentUser: async () => {
    try {
      return await apiClient.get(ENDPOINTS.ME);
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  },
  
  /**
   * Guarda el usuario en el almacenamiento local
   * @param {User} user - Usuario a guardar
   * @returns {Promise<boolean>} Éxito de la operación
   */
  saveUser: async (user) => {
    try {
      if (!(user instanceof User)) {
        user = new User(user);
      }
      
      await AsyncStorage.setItem('userData', JSON.stringify(user.toJSON()));
      return true;
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      return false;
    }
  },
  
  /**
   * Actualiza el usuario en el servidor y localmente
   * @param {Object} userData - Datos a actualizar
   * @returns {Promise<User>} Usuario actualizado
   */
  updateUser: async (userData) => {
    try {
      // Obtener usuario actual
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Actualizar en el servidor
      const response = await apiClient.put(`/api/users/${currentUser.id}`, userData);
      
      // Actualizar localmente
      const updatedUser = currentUser.update(response.data);
      await userService.saveUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      throw error;
    }
  },
  
  /**
   * Actualiza las preferencias del usuario
   * @param {Object} preferences - Nuevas preferencias
   * @returns {Promise<User>} Usuario actualizado
   */
  updatePreferences: async (preferences) => {
    try {
      // Obtener usuario actual
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Actualizar en el servidor
      await apiClient.put(`/api/users/${currentUser.id}/preferences`, preferences);
      
      // Actualizar localmente
      const updatedUser = currentUser.updatePreferences(preferences);
      await userService.saveUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar preferencias:', error);
      throw error;
    }
  },
  
  /**
   * Añade un objetivo terapéutico
   * @param {Object} goal - Nuevo objetivo
   * @returns {Promise<User>} Usuario actualizado
   */
  addTherapeuticGoal: async (goal) => {
    try {
      // Obtener usuario actual
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Añadir en el servidor
      const response = await apiClient.post(`/api/users/${currentUser.id}/goals`, goal);
      
      // Actualizar localmente con el ID generado por el servidor
      const serverGoal = response.data;
      const updatedUser = currentUser.addTherapeuticGoal(serverGoal);
      await userService.saveUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error al añadir objetivo terapéutico:', error);
      throw error;
    }
  },
  
  /**
   * Actualiza el progreso de un objetivo
   * @param {string} goalId - ID del objetivo
   * @param {number} progress - Nuevo progreso (0-100)
   * @returns {Promise<User>} Usuario actualizado
   */
  updateGoalProgress: async (goalId, progress) => {
    try {
      // Obtener usuario actual
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Actualizar en el servidor
      await apiClient.put(`/api/users/${currentUser.id}/goals/${goalId}`, { progress });
      
      // Actualizar localmente
      const updatedUser = currentUser.updateGoalProgress(goalId, progress);
      await userService.saveUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error al actualizar progreso de objetivo:', error);
      throw error;
    }
  },
  
  /**
   * Registra una nueva sesión terapéutica
   * @param {number} duration - Duración en minutos
   * @param {Object} emotionalState - Estado emocional
   * @returns {Promise<User>} Usuario actualizado
   */
  recordSession: async (duration, emotionalState) => {
    try {
      // Obtener usuario actual
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Registrar en el servidor
      const sessionData = { duration, emotionalState };
      await apiClient.post(`/api/users/${currentUser.id}/sessions`, sessionData);
      
      // Actualizar localmente
      const updatedUser = currentUser.recordSession(duration, emotionalState);
      await userService.saveUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Error al registrar sesión:', error);
      
      // Intentar actualizar localmente aunque falle el servidor
      try {
        const currentUser = await userService.getCurrentUser();
        if (currentUser) {
          const updatedUser = currentUser.recordSession(duration, emotionalState);
          await userService.saveUser(updatedUser);
          return updatedUser;
        }
      } catch (localError) {
        console.error('Error al actualizar localmente:', localError);
      }
      
      throw error;
    }
  },
  
  /**
   * Elimina los datos del usuario del almacenamiento local
   * @returns {Promise<boolean>} Éxito de la operación
   */
  clearUserData: async () => {
    try {
      await AsyncStorage.removeItem('userData');
      return true;
    } catch (error) {
      console.error('Error al eliminar datos de usuario:', error);
      return false;
    }
  },
  
  /**
   * Obtiene los objetivos terapéuticos del usuario
   * @returns {Promise<Array>} Lista de objetivos
   */
  getTherapeuticGoals: async () => {
    try {
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      // Intentar obtener del servidor primero
      try {
        const response = await apiClient.get(`/api/users/${currentUser.id}/goals`);
        
        // Actualizar localmente si hay diferencias
        if (response.data && Array.isArray(response.data)) {
          // Actualizar los objetivos en el usuario local
          currentUser.therapeuticProfile.goals = response.data;
          await userService.saveUser(currentUser);
          return response.data;
        }
      } catch (serverError) {
        console.log('Error al obtener objetivos del servidor, usando datos locales:', serverError);
      }
      
      // Devolver datos locales si no se pudo obtener del servidor
      return currentUser.therapeuticProfile.goals || [];
    } catch (error) {
      console.error('Error al obtener objetivos terapéuticos:', error);
      return [];
    }
  },
  
  /**
   * Obtiene el historial emocional del usuario
   * @param {number} limit - Número máximo de registros
   * @returns {Promise<Array>} Historial emocional
   */
  getEmotionalHistory: async (limit = 10) => {
    try {
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) throw new Error('No hay usuario autenticado');
      
      const history = currentUser.therapeuticProfile.emotionalHistory || [];
      return history.slice(-limit);
    } catch (error) {
      console.error('Error al obtener historial emocional:', error);
      return [];
    }
  },

  // Modificar la verificación de conexión
  checkServerConnection: async () => {
    try {
      console.log('Verificando conexión con:', `${API_BASE_URL}/api/health`);
      const response = await apiClient.get('/api/health', {
        timeout: 5000 // Reducimos el timeout para esta verificación
      });
      return response.status === 200;
    } catch (error) {
      console.error('Error verificando conexión:', error);
      return false;
    }
  },

  // Actualizar la función register
  register: async (userData) => {
    try {
      console.log('Iniciando registro con:', userData);
      
      // Verificar conexión
      const isConnected = await userService.checkServerConnection();
      if (!isConnected) {
        throw new Error('No se puede conectar con el servidor. Por favor, verifica tu conexión.');
      }

      const response = await apiClient.post(ENDPOINTS.REGISTER, userData);
      console.log('Respuesta del registro:', response);

      // Guardar token si está presente
      if (response.data && response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      }

      return response;
    } catch (error) {
      if (!error.response) {
        console.error('Error de conexión:', error);
        throw new Error('No se puede conectar con el servidor. Por favor, verifica tu conexión.');
      }
      console.error('Error detallado en registro:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  },

  login: async (credentials) => {
    try {
      const response = await apiClient.post(ENDPOINTS.LOGIN, credentials);
      
      // Guardar token si está presente
      if (response.data && response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      }
      
      return response;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  },

  recoverPassword: async (email) => {
    try {
      const response = await apiClient.post('/api/auth/recover-password', { email });
      return response.data;
    } catch (error) {
      console.error('Error en recuperación de contraseña:', error);
      throw error;
    }
  },

  verifyCode: async (email, code) => {
    try {
      const response = await apiClient.post('/api/auth/verify-code', { email, code });
      return response.data;
    } catch (error) {
      console.error('Error al verificar código:', error);
      throw error;
    }
  },

  resetPassword: async (email, code, newPassword) => {
    try {
      const response = await apiClient.post('/api/auth/reset-password', { email, code, newPassword });
      return response.data;
    } catch (error) {
      console.error('Error al restablecer contraseña:', error);
      throw error;
    }
  }
};
