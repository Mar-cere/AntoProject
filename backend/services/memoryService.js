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
              emotion: analysis.emotionalContext.mainEmotion,
              intensity: analysis.emotionalContext.intensity
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
        { upsert: true }
      );
    } catch (error) {
      console.error('Error actualizando insights:', error);
    }
  },

  async getRelevantContext(userId, currentMessage) {
    try {
      const userInsights = await UserInsight.findOne({ userId });
      if (!userInsights) return null;

      // Obtener patrones relevantes para el mensaje actual
      const relevantPatterns = userInsights.recurringPatterns.filter(pattern => 
        new RegExp(pattern, 'i').test(currentMessage)
      );

      // Obtener objetivos activos
      const activeGoals = userInsights.activeGoals;

      // Obtener el estado emocional predominante
      const emotionalTrend = userInsights.interactions
        .slice(-5)
        .reduce((acc, interaction) => {
          acc[interaction.emotion] = (acc[interaction.emotion] || 0) + 1;
          return acc;
        }, {});

      return {
        patterns: relevantPatterns,
        goals: activeGoals,
        emotionalTrend,
        lastInteraction: userInsights.lastUpdate
      };
    } catch (error) {
      console.error('Error obteniendo contexto:', error);
      return null;
    }
  }
};
