import AsyncStorage from '@react-native-async-storage/async-storage';
import User from '../backend/models/User';
import axios from 'axios';
import { OPENAI_API_KEY } from './openai';

// URL base de la API
const API_BASE_URL = 'https://antobackend.onrender.com';

// Crear cliente axios con interceptores
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir token a las peticiones
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

/**
 * Servicio para gestionar usuarios
 */
const userService = {
  /**
   * Obtiene el usuario actual desde el almacenamiento local
   * @returns {Promise<User|null>} Usuario actual o null
   */
  getCurrentUser: async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) return null;
      
      return User.fromJSON(userData);
    } catch (error) {
      console.error('Error al obtener usuario actual:', error);
      return null;
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
  }
};

export default userService; 