import UserInsight from '../models/UserInsight.js';

const DEFAULT_CONTEXT = {
  emotionalTrend: {
    latest: 'neutral',
    history: []
  },
  patterns: [],
  goals: [],
  lastInteraction: new Date()
};

const memoryService = {
  async updateUserInsights(userId, message, analysis) {
    try {
      const insights = {
        patterns: {
          studyHabits: /estudio|carrera|universidad|materia/i,
          emotionalState: /siento|me siento|estoy|ánimo/i,
          relationships: /amigos|familia|pareja|relación/i,
          selfDevelopment: /mejorar|cambiar|crecer|futuro/i
        },
        goals: {
          academic: /quiero|necesito|debo|estudiar|aprobar/i,
          personal: /ser|convertirme|lograr|alcanzar/i,
          emotional: /sentirme|estar|superar/i
        }
      };

      // Analizar el mensaje para patrones y objetivos
      const detectedPatterns = {};
      const detectedGoals = {};

      Object.entries(insights.patterns).forEach(([key, pattern]) => {
        if (pattern.test(message.content)) {
          detectedPatterns[key] = true;
        }
      });

      Object.entries(insights.goals).forEach(([key, pattern]) => {
        if (pattern.test(message.content)) {
          detectedGoals[key] = true;
        }
      });

      // Actualizar insights del usuario
      await UserInsight.findOneAndUpdate(
        { userId },
        {
          $push: {
            interactions: {
              timestamp: new Date(),
              patterns: detectedPatterns,
              goals: detectedGoals,
              emotion: analysis?.emotionalContext?.mainEmotion || 'neutral',
              intensity: analysis?.emotionalContext?.intensity || 5
            }
          },
          $set: {
            lastUpdate: new Date()
          },
          $addToSet: {
            recurringPatterns: Object.keys(detectedPatterns),
            activeGoals: Object.keys(detectedGoals)
          }
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error actualizando insights:', error);
    }
  },

  async getRelevantContext(userId, currentMessage) {
    try {
      const userInsight = await UserInsight.findOne({ userId });
      
      if (!userInsight) {
        return DEFAULT_CONTEXT;
      }

      // Obtener las últimas 5 interacciones
      const recentInteractions = userInsight.interactions.slice(-5);
      
      // Calcular tendencia emocional
      const emotionalTrend = {
        latest: recentInteractions.length > 0 
          ? recentInteractions[recentInteractions.length - 1].emotion 
          : 'neutral',
        history: recentInteractions.map(i => i.emotion)
      };

      return {
        emotionalTrend,
        patterns: userInsight.recurringPatterns || [],
        goals: userInsight.activeGoals || [],
        lastInteraction: userInsight.lastUpdate || new Date()
      };

    } catch (error) {
      console.error('Error obteniendo contexto:', error);
      return DEFAULT_CONTEXT;
    }
  }
};

export default memoryService;
