import UserGoals from '../models/UserGoals.js';
import UserProgress from '../models/UserProgress.js';

const goalTracker = {
  goalCategories: {
    DESARROLLO_PERSONAL: {
      patterns: {
        crecimiento: /(?:mejorar|crecer|desarrollar|avanzar|progresar|cambiar)/i,
        autoconocimiento: /(?:entender|conocerme|descubrir|explorar|comprender)/i,
        relaciones: /(?:conectar|relacionar|comunicar|expresar|compartir)/i
      },
      indicators: {
        positive: /(?:logré|conseguí|avancé|mejor|progreso)/i,
        obstacles: /(?:difícil|cuesta|problema|obstáculo|desafío)/i,
        insights: /(?:darme cuenta|entendí|comprendo|veo que|aprendí)/i
      },
      weightings: {
        insight: 0.3,
        action: 0.4,
        consistency: 0.3
      }
    },
    BIENESTAR_EMOCIONAL: {
      patterns: {
        regulación: /(?:manejar|controlar|regular|gestionar|calmar)/i,
        consciencia: /(?:sentir|percibir|notar|identificar|reconocer)/i,
        expresión: /(?:expresar|compartir|comunicar|decir|hablar)/i
      },
      indicators: {
        awareness: /(?:me siento|percibo|noto|identifico)/i,
        regulation: /(?:puedo manejar|logro controlar|consigo regular)/i,
        reflection: /(?:reflexiono|pienso sobre|analizo|considero)/i
      },
      weightings: {
        awareness: 0.35,
        expression: 0.3,
        regulation: 0.35
      }
    },
    RELACIONES_INTERPERSONALES: {
      patterns: {
        vínculos: /(?:relación|amistad|familia|pareja|conexión)/i,
        comunicación: /(?:hablar|expresar|compartir|dialogar|comunicar)/i,
        límites: /(?:límite|espacio|necesito|quiero|puedo)/i
      },
      indicators: {
        quality: /(?:mejor|más cercano|más profundo|más fuerte)/i,
        challenges: /(?:conflicto|problema|dificultad|tensión)/i,
        growth: /(?:aprender|crecer|desarrollar|mejorar)/i
      },
      weightings: {
        interaction: 0.3,
        depth: 0.35,
        boundaries: 0.35
      }
    }
  },

  async analyzeProgress(message, emotionalAnalysis) {
    try {
      const content = message.content.toLowerCase();
      const progress = {
        category: null,
        score: 0,
        insights: [],
        patterns: []
      };

      // Análisis de patrones y categorías
      for (const [category, data] of Object.entries(this.goalCategories)) {
        let categoryScore = 0;
        const categoryInsights = [];
        const detectedPatterns = [];

        // Analizar patrones específicos
        for (const [type, pattern] of Object.entries(data.patterns)) {
          if (pattern.test(content)) {
            detectedPatterns.push(type);
            categoryScore += data.weightings[Object.keys(data.weightings)[0]];
          }
        }

        // Analizar indicadores
        for (const [indicator, pattern] of Object.entries(data.indicators)) {
          if (pattern.test(content)) {
            categoryInsights.push({
              type: indicator,
              context: content.match(pattern)[0]
            });
            categoryScore += 0.2;
          }
        }

        // Ajustar score basado en el estado emocional
        if (emotionalAnalysis?.emotionalState?.intensity > 7) {
          categoryScore *= 1.2; // Mayor impacto en momentos de alta intensidad emocional
        }

        if (categoryScore > progress.score) {
          progress.category = category;
          progress.score = categoryScore;
          progress.insights = categoryInsights;
          progress.patterns = detectedPatterns;
        }
      }

      return progress;
    } catch (error) {
      console.error('Error en análisis de progreso:', error);
      return null;
    }
  },

  async updateGoalProgress(userId, message, analysis) {
    try {
      const progress = await this.analyzeProgress(message, analysis);
      if (!progress || !progress.category) return;

      const userGoals = await UserGoals.findOne({ userId });
      if (!userGoals) return;

      const update = {
        $inc: { 'goals.$.progress': progress.score },
        $push: {
          'goals.$.milestones': {
            date: new Date(),
            description: message.content,
            emotionalContext: {
              emotion: analysis.emotionalState?.primary || 'neutral',
              intensity: analysis.emotionalState?.intensity || 5
            },
            insights: progress.insights,
            patterns: progress.patterns
          }
        }
      };

      await UserGoals.updateOne(
        { 
          userId, 
          'goals.category': progress.category 
        },
        update
      );

      return progress;
    } catch (error) {
      console.error('Error actualizando progreso:', error);
      return null;
    }
  },

  async trackProgress(userId, mensaje) {
    try {
      let userProgress = await UserProgress.findOne({ userId });
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }

      const progressEntry = {
        timestamp: new Date(),
        emotionalState: mensaje.metadata?.context?.emotional || {
          mainEmotion: 'neutral',
          intensity: 5
        },
        context: {
          topic: mensaje.metadata?.context?.contextual?.tema?.categoria || 'GENERAL',
          triggers: [],
          copingStrategies: []
        },
        sessionMetrics: {
          duration: 0,
          messageCount: 1,
          responseQuality: 3
        }
      };

      await userProgress.addProgressEntry(progressEntry);
      return userProgress;
    } catch (error) {
      console.error('Error tracking progress:', error);
      return null;
    }
  }
};

export default goalTracker; 