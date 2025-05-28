import UserGoals from '../models/UserGoals.js';
import mongoose from 'mongoose';
import UserProgress from '../models/UserProgress.js';

class GoalTracker {
  /**
   * Rastrea el progreso del usuario basado en el mensaje y análisis.
   * @param {string} userId - ID del usuario.
   * @param {Object} data - Debe contener 'message' y 'analysis'.
   * @returns {Promise<Object|null>} Objetivos del usuario o null si hay error.
   */
  async trackProgress(userId, data) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof require('mongoose').Types.ObjectId))) {
        throw new Error('userId y data válidos son requeridos');
      }
      const { message, analysis } = data;
      if (!message || typeof message.content !== 'string') {
        throw new Error('El mensaje debe tener contenido válido');
      }
      let userGoals = await UserGoals.findOne({ userId });
      if (!userGoals) {
        userGoals = await this.initializeUserGoals(userId);
      }
      await this.updateGoalProgress(userId, message, analysis);
      return userGoals;
    } catch (error) {
      console.error('[GoalTracker] Error tracking progress:', error, { userId, data });
      return null;
    }
  }

  /**
   * Actualiza el progreso del usuario basado en el contexto.
   * @param {string} userId - ID del usuario.
   * @param {Object} data - Debe contener 'message' y 'context'.
   * @returns {Promise<Object|null>} Objetivos del usuario actualizados o null si hay error.
   */
  async updateProgress(userId, data) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof mongoose.Types.ObjectId))) {
        throw new Error('userId y data válidos son requeridos');
      }
      const { message, context } = data;
      if (!message || typeof message.content !== 'string') {
        throw new Error('El mensaje debe tener contenido válido');
      }
      let userGoals = await UserGoals.findOne({ userId });
      if (!userGoals) {
        userGoals = await this.initializeUserGoals(userId);
      }
      // Actualizar progreso basado en el contexto
      const updates = this.calculateProgressUpdates(message, context);
      return await UserGoals.findOneAndUpdate(
        { userId },
        {
          $set: {
            'lastUpdate': new Date(),
            ...updates
          }
        },
        { new: true }
      );
    } catch (error) {
      console.error('[GoalTracker] Error updating progress:', error, { userId, data });
      return null;
    }
  }

  /**
   * Inicializa los objetivos del usuario si no existen.
   * @param {string} userId - ID del usuario.
   * @returns {Promise<Object|null>} Documento de objetivos creado o null si hay error.
   */
  async initializeUserGoals(userId) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof mongoose.Types.ObjectId))) {
        throw new Error('userId válido es requerido');
      }
      return await UserGoals.create({
        userId,
        goals: [],
        progress: {
          overall: 0,
          byCategory: {}
        },
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('[GoalTracker] Error initializing user goals:', error, { userId });
      return null;
    }
  }

  /**
   * Calcula las actualizaciones de progreso basadas en el mensaje y contexto.
   * @param {Object} message - Mensaje del usuario.
   * @param {Object} context - Contexto del mensaje.
   * @returns {Object} Actualizaciones para el progreso.
   */
  calculateProgressUpdates(message, context) {
    const updates = {
      'progress.lastInteraction': new Date()
    };
    if (context?.emotional?.mainEmotion) {
      updates['progress.emotionalState'] = {
        emotion: context.emotional.mainEmotion,
        intensity: context.emotional.intensity || 5,
        timestamp: new Date()
      };
    }
    if (context?.contextual?.topics) {
      updates['progress.activeTopics'] = context.contextual.topics;
    }
    return updates;
  }

  /**
   * Actualiza el progreso de los objetivos del usuario con una nueva interacción.
   * @param {string} userId - ID del usuario.
   * @param {Object} message - Mensaje del usuario.
   * @param {Object} analysis - Análisis del mensaje.
   * @returns {Promise<Object|null>} Documento actualizado o null si hay error.
   */
  async updateGoalProgress(userId, message, analysis) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof require('mongoose').Types.ObjectId)) || !message || typeof message.content !== 'string') {
        throw new Error('userId y mensaje válidos son requeridos');
      }
      const update = {
        $push: {
          'interactions': {
            timestamp: new Date(),
            content: message.content,
            analysis: analysis
          }
        },
        $set: {
          'lastUpdate': new Date()
        }
      };
      return await UserGoals.findOneAndUpdate(
        { userId },
        update,
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error('[GoalTracker] Error updating goal progress:', error, { userId, message, analysis });
      return null;
    }
  }
}

export default new GoalTracker(); 