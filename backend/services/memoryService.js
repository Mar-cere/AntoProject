import UserInsight from '../models/UserInsight.js';

const DEFAULT_CONTEXT = {
  emotionalTrend: {
    latest: 'neutral',
    history: [],
    patterns: {}
  },
  cognitivePatterns: {
    pensamientos: [],
    creencias: [],
    sesgos: []
  },
  interactionContext: {
    frecuencia: {},
    horarios: {},
    duracion: {}
  },
  lastInteraction: new Date()
};

class MemoryService {
  constructor() {
    this.interactionPeriods = {
      MORNING: { start: 5, end: 11 },
      AFTERNOON: { start: 12, end: 17 },
      EVENING: { start: 18, end: 21 },
      NIGHT: { start: 22, end: 4 }
    };
  }

  /**
   * Obtiene el contexto relevante para un usuario y mensaje.
   * @param {string} userId - ID del usuario.
   * @param {string} content - Contenido del mensaje.
   * @param {Object} currentAnalysis - Análisis actual (opcional).
   * @returns {Promise<Object>} Contexto relevante.
   */
  async getRelevantContext(userId, content, currentAnalysis = {}) {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('userId válido es requerido');
      }
      if (!content || typeof content !== 'string') {
        throw new Error('content válido es requerido');
      }
      const recentInteractions = await this.getRecentInteractions(userId);
      const interactionContext = this.analyzeInteractionContext(recentInteractions);
      const currentPeriod = this.getCurrentPeriod();

      return {
        patterns: {
          timing: interactionContext.timing || {},
          frequency: interactionContext.frequency || {},
          topics: interactionContext.topics || []
        },
        currentContext: {
          period: currentPeriod,
          analysis: currentAnalysis,
          recentTopics: this.extractRecentTopics(recentInteractions)
        },
        history: {
          lastInteraction: recentInteractions[0] || null,
          commonPatterns: this.findCommonPatterns(recentInteractions)
        }
      };
    } catch (error) {
      console.error('[MemoryService] Error obteniendo contexto:', error, { userId, content });
      return this.getDefaultContext();
    }
  }

  getCurrentPeriod() {
    const hour = new Date().getHours();
    
    for (const [period, times] of Object.entries(this.interactionPeriods)) {
      if (times.start <= hour && hour <= times.end) {
        return period;
      }
    }
    
    return 'NIGHT';
  }

  /**
   * Obtiene las interacciones recientes de un usuario.
   * @param {string} userId - ID del usuario.
   * @param {number} limit - Límite de interacciones (opcional).
   * @returns {Promise<Array>} Lista de interacciones.
   */
  async getRecentInteractions(userId, limit = 10) {
    try {
      if (!userId || typeof userId !== 'string') {
        throw new Error('userId válido es requerido');
      }
      // Aquí deberías implementar la lógica real de obtención de interacciones
      return [];
    } catch (error) {
      console.error('[MemoryService] Error obteniendo interacciones recientes:', error, { userId });
      return [];
    }
  }

  /**
   * Analiza el contexto de las interacciones.
   * @param {Array} interactions - Lista de interacciones.
   * @returns {Object} Contexto analizado.
   */
  analyzeInteractionContext(interactions) {
    const context = {
      timing: {},
      frequency: {
        daily: 0,
        weekly: 0
      },
      topics: []
    };

    if (!Array.isArray(interactions) || interactions.length === 0) {
      return context;
    }

    interactions.forEach(interaction => {
      if (interaction && interaction.timestamp) {
        const period = this.getPeriodFromTimestamp(interaction.timestamp);
        context.timing[period] = (context.timing[period] || 0) + 1;
      }
    });

    return context;
  }

  getPeriodFromTimestamp(timestamp) {
    const hour = new Date(timestamp).getHours();
    
    for (const [period, times] of Object.entries(this.interactionPeriods)) {
      if (times.start <= hour && hour <= times.end) {
        return period;
      }
    }
    
    return 'NIGHT';
  }

  /**
   * Extrae los temas recientes de las interacciones.
   * @param {Array} interactions - Lista de interacciones.
   * @returns {Array} Temas recientes.
   */
  extractRecentTopics(interactions) {
    const topics = new Set();
    
    if (!Array.isArray(interactions)) return [];
    interactions.forEach(interaction => {
      if (interaction?.metadata?.topics) {
        interaction.metadata.topics.forEach(topic => topics.add(topic));
      }
    });

    return Array.from(topics);
  }

  findCommonPatterns(interactions) {
    return {
      timePatterns: this.analyzeTimePatterns(interactions),
      topicPatterns: this.analyzeTopicPatterns(interactions),
      emotionalPatterns: this.analyzeEmotionalPatterns(interactions)
    };
  }

  analyzeTimePatterns(interactions) {
    const patterns = {};
    
    interactions.forEach(interaction => {
      if (interaction?.timestamp) {
        const hour = new Date(interaction.timestamp).getHours();
        patterns[hour] = (patterns[hour] || 0) + 1;
      }
    });

    return patterns;
  }

  analyzeTopicPatterns(interactions) {
    const topics = {};
    
    interactions.forEach(interaction => {
      if (interaction?.metadata?.topics) {
        interaction.metadata.topics.forEach(topic => {
          topics[topic] = (topics[topic] || 0) + 1;
        });
      }
    });

    return topics;
  }

  analyzeEmotionalPatterns(interactions) {
    const emotions = {};
    
    interactions.forEach(interaction => {
      if (interaction?.metadata?.emotional?.mainEmotion) {
        const emotion = interaction.metadata.emotional.mainEmotion;
        emotions[emotion] = (emotions[emotion] || 0) + 1;
      }
    });

    return emotions;
  }

  getDefaultContext() {
    return {
      patterns: {
        timing: {},
        frequency: {
          daily: 0,
          weekly: 0
        },
        topics: []
      },
      currentContext: {
        period: this.getCurrentPeriod(),
        analysis: {},
        recentTopics: []
      },
      history: {
        lastInteraction: null,
        commonPatterns: {
          timePatterns: {},
          topicPatterns: {},
          emotionalPatterns: {}
        }
      }
    };
  }

  async updateUserInsights(userId, message, analysis) {
    try {
      const timestamp = new Date();
      const hora = timestamp.getHours();

      const cognitiveInsights = this.analyzeCognitivePatterns(message.content);
      const contextInsights = this.analyzeContext(message.content);
      const emotionalIntensity = analysis?.emotionalContext?.intensity || 5;
      
      const interaction = {
        timestamp,
        content: message.content,
        emotion: analysis?.emotionalContext?.mainEmotion || 'neutral',
        intensity: emotionalIntensity,
        cognitivePatterns: cognitiveInsights,
        context: contextInsights,
        horario: {
          hora,
          periodo: this.categorizarHorario(hora)
        }
      };

      const update = await UserInsight.findOneAndUpdate(
        { userId },
        {
          $push: {
            interactions: {
              $each: [interaction],
              $slice: -50
            }
          },
          $set: {
            lastUpdate: timestamp,
            'stats.lastEmotion': interaction.emotion,
            'stats.lastIntensity': interaction.intensity
          },
          $inc: {
            [`stats.horarios.${interaction.horario.periodo}`]: 1,
            'stats.totalInteractions': 1
          }
        },
        { 
          upsert: true, 
          new: true,
          setDefaultsOnInsert: true
        }
      );

      return update;
    } catch (error) {
      console.error('Error actualizando insights:', error);
      return null;
    }
  }

  analyzeCognitivePatterns(content) {
    const patterns = {};
    
    for (const [category, categoryPatterns] of Object.entries(this.patternAnalyzers)) {
      patterns[category] = {};
      for (const [pattern, regex] of Object.entries(categoryPatterns)) {
        if (regex.test(content)) {
          patterns[category][pattern] = content.match(regex)[0];
        }
      }
    }

    return patterns;
  }

  analyzeContext(content) {
    const contexts = {};
    
    for (const [context, pattern] of Object.entries(this.contextPatterns)) {
      if (pattern.test(content)) {
        contexts[context] = content.match(pattern)[0];
      }
    }

    return contexts;
  }

  categorizarHorario(hora) {
    if (hora >= 5 && hora < 12) return 'mañana';
    if (hora >= 12 && hora < 18) return 'tarde';
    if (hora >= 18 && hora < 22) return 'noche';
    return 'madrugada';
  }

  analyzeEmotionalTrend(interactions) {
    const emotions = interactions.map(i => ({
      emotion: i.emotion,
      intensity: i.intensity,
      timestamp: i.timestamp
    }));

    return {
      latest: emotions[emotions.length - 1]?.emotion || 'neutral',
      history: emotions,
      patterns: this.detectEmotionalPatterns(emotions)
    };
  }

  detectEmotionalPatterns(emotions) {
    const patterns = {
      intensidad: {
        alta: 0,
        baja: 0
      },
      fluctuación: [],
      emocionesDominantes: new Map()
    };

    emotions.forEach(e => {
      if (e.intensity > 7) patterns.intensidad.alta++;
      if (e.intensity < 4) patterns.intensidad.baja++;

      patterns.emocionesDominantes.set(
        e.emotion,
        (patterns.emocionesDominantes.get(e.emotion) || 0) + 1
      );

      if (patterns.fluctuación.length > 0) {
        const lastEmotion = patterns.fluctuación[patterns.fluctuación.length - 1];
        if (lastEmotion !== e.emotion) {
          patterns.fluctuación.push(e.emotion);
        }
      } else {
        patterns.fluctuación.push(e.emotion);
      }
    });

    return patterns;
  }

  analyzeCognitiveHistory(interactions) {
    return interactions.reduce((patterns, interaction) => {
      if (interaction.cognitivePatterns) {
        Object.entries(interaction.cognitivePatterns).forEach(([category, categoryPatterns]) => {
          if (!patterns[category]) patterns[category] = [];
          patterns[category].push(...Object.keys(categoryPatterns));
        });
      }
      return patterns;
    }, {});
  }
}

export default new MemoryService();
