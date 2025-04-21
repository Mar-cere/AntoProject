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

const memoryService = {
  patternAnalyzers: {
    pensamientos: {
      catastrofización: /(?:siempre|nunca|todo|nada|terrible|horrible|desastre)/i,
      generalización: /(?:todos|nadie|siempre|jamás|cada vez|típico)/i,
      personalización: /(?:mi culpa|por mi|debería|tengo que|debo)/i,
      dicotómico: /(?:o|sino|perfecto|fracaso|éxito|todo o nada)/i
    },
    creencias: {
      autoestima: /(?:no puedo|no sirvo|soy un|no valgo|incapaz)/i,
      expectativas: /(?:debería|tengo que|necesito ser|debo ser)/i,
      relaciones: /(?:nadie me|todos son|siempre me|nunca me)/i
    },
    comportamientos: {
      evitación: /(?:mejor no|evito|prefiero no|no quiero|me da miedo)/i,
      búsquedaApoyo: /(?:necesito ayuda|quiero hablar|busco consejo|alguien que)/i,
      afrontamiento: /(?:intentaré|probaré|buscaré|trataré|voy a)/i
    }
  },

  contextPatterns: {
    académico: /(?:estudios|universidad|carrera|materias|exámenes|clases)/i,
    relacional: /(?:amigos|familia|pareja|relaciones|social)/i,
    personal: /(?:futuro|metas|objetivos|desarrollo|crecimiento)/i,
    emocional: /(?:sentimientos|emociones|estado|ánimo|humor)/i
  },

  async updateUserInsights(userId, message, analysis) {
    try {
      const timestamp = new Date();
      const hora = timestamp.getHours();

      // Análisis de patrones cognitivos
      const cognitiveInsights = this.analyzeCognitivePatterns(message.content);
      
      // Análisis de contexto
      const contextInsights = this.analyzeContext(message.content);

      // Análisis de intensidad emocional
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

      // Actualizar insights del usuario
      const update = await UserInsight.findOneAndUpdate(
        { userId },
        {
          $push: {
            interactions: {
              $each: [interaction],
              $slice: -50 // Mantener últimas 50 interacciones
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
  },

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
  },

  analyzeContext(content) {
    const contexts = {};
    
    for (const [context, pattern] of Object.entries(this.contextPatterns)) {
      if (pattern.test(content)) {
        contexts[context] = content.match(pattern)[0];
      }
    }

    return contexts;
  },

  categorizarHorario(hora) {
    if (hora >= 5 && hora < 12) return 'mañana';
    if (hora >= 12 && hora < 18) return 'tarde';
    if (hora >= 18 && hora < 22) return 'noche';
    return 'madrugada';
  },

  async getRelevantContext(userId, currentMessage) {
    try {
      const userInsight = await UserInsight.findOne({ userId });
      
      if (!userInsight) {
        return DEFAULT_CONTEXT;
      }

      // Obtener últimas 10 interacciones
      const recentInteractions = userInsight.interactions.slice(-10);
      
      // Análisis de tendencias emocionales
      const emotionalTrend = this.analyzeEmotionalTrend(recentInteractions);

      // Análisis de patrones cognitivos recurrentes
      const cognitivePatterns = this.analyzeCognitiveHistory(recentInteractions);

      // Análisis de contexto de interacción
      const interactionContext = this.analyzeInteractionContext(recentInteractions);

      return {
        emotionalTrend,
        cognitivePatterns,
        interactionContext,
        lastInteraction: userInsight.lastUpdate || new Date()
      };

    } catch (error) {
      console.error('Error obteniendo contexto:', error);
      return DEFAULT_CONTEXT;
    }
  },

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
  },

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
      // Analizar intensidad
      if (e.intensity > 7) patterns.intensidad.alta++;
      if (e.intensity < 4) patterns.intensidad.baja++;

      // Registrar emociones dominantes
      patterns.emocionesDominantes.set(
        e.emotion,
        (patterns.emocionesDominantes.get(e.emotion) || 0) + 1
      );

      // Analizar fluctuaciones
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
  },

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
  },

  analyzeInteractionContext(interactions) {
    const context = {
      frecuencia: {},
      horarios: {},
      duracion: {}
    };

    interactions.forEach(interaction => {
      const { horario } = interaction;
      context.horarios[horario.periodo] = (context.horarios[horario.periodo] || 0) + 1;
    });

    return context;
  }
};

export default memoryService;
