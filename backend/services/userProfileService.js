import UserProfile from '../models/UserProfile.js';
import Message from '../models/Message.js';
import openaiService from './openaiService.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';
import mongoose from 'mongoose';

const PERIODOS = {
  MADRUGADA: { inicio: 0, fin: 5, nombre: 'madrugada' },
  MAÑANA: { inicio: 6, fin: 11, nombre: 'mañana' },
  MEDIODIA: { inicio: 12, fin: 14, nombre: 'mediodía' },
  TARDE: { inicio: 15, fin: 18, nombre: 'tarde' },
  NOCHE: { inicio: 19, fin: 23, nombre: 'noche' }
};

const DIMENSIONES_ANALISIS = {
  EMOCIONAL: {
    aspectos: ['intensidad', 'variabilidad', 'regulación'],
    patrones: ['recurrentes', 'situacionales', 'temporales']
  },
  COGNITIVO: {
    aspectos: ['flexibilidad', 'autocrítica', 'creencias'],
    patrones: ['automáticos', 'adaptativos', 'desadaptativos']
  },
  CONDUCTUAL: {
    aspectos: ['afrontamiento', 'evitación', 'búsqueda_apoyo'],
    patrones: ['activos', 'pasivos', 'mixtos']
  },
  RELACIONAL: {
    aspectos: ['vínculos', 'comunicación', 'límites'],
    patrones: ['cercanos', 'sociales', 'profesionales']
  }
};

class UserProfileService {
  /**
   * Obtiene o crea el perfil de usuario.
   * @param {string} userId - ID del usuario.
   * @returns {Promise<Object>} Perfil de usuario.
   */
  async getOrCreateProfile(userId) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof mongoose.Types.ObjectId))) {
        throw new Error('userId válido es requerido');
      }
      let userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        userProfile = await UserProfile.create({
          userId,
          preferences: {
            communicationStyle: 'neutral',
            responseLength: 'MEDIUM',
            topicsOfInterest: [],
            triggerTopics: []
          },
          patrones: {
            emocionales: [],
            conexion: [],
            temas: []
          },
          metadata: {
            ultimaInteraccion: new Date(),
            sesionesCompletadas: 0,
            progresoGeneral: 0
          }
        });
      }

      return userProfile;
    } catch (error) {
      console.error('[UserProfileService] Error en getOrCreateProfile:', error, { userId });
      // Retornar un perfil por defecto en caso de error
      return {
        userId,
        preferences: {
          communicationStyle: 'neutral',
          responseLength: 'MEDIUM'
        },
        patrones: {
          emocionales: [],
          conexion: [],
          temas: []
        }
      };
    }
  }

  /**
   * Actualiza el perfil del usuario con un nuevo mensaje y análisis.
   * @param {string} userId - ID del usuario.
   * @param {Object} mensaje - Mensaje recibido.
   * @param {Object} analisis - Análisis del mensaje.
   * @returns {Promise<Object|null>} Perfil actualizado o null si hay error.
   */
  async actualizarPerfil(userId, mensaje, analisis) {
    try {
      if (!userId || (typeof userId !== 'string' && !(userId instanceof mongoose.Types.ObjectId))) {
        throw new Error('userId válido es requerido');
      }
      if (!mensaje || typeof mensaje !== 'object') {
        throw new Error('mensaje válido es requerido');
      }
      const actualizacion = {
        $push: {
          'patrones.emocionales': {
            emocion: analisis?.emotional?.mainEmotion || 'neutral',
            intensidad: analisis?.emotional?.intensity || 5,
            timestamp: new Date()
          }
        },
        $set: {
          'metadata.ultimaInteraccion': new Date(),
          'metadata.ultimoContexto': analisis?.contextual || {}
        },
        $inc: {
          'metadata.sesionesCompletadas': 1
        }
      };

      return await UserProfile.findOneAndUpdate(
        { userId },
        actualizacion,
        { 
          new: true, 
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (error) {
      console.error('[UserProfileService] Error actualizando perfil:', error, { userId, mensaje, analisis });
      return null;
    }
  }

  async getPersonalizedPrompt(userId) {
    try {
      const perfil = await this.getOrCreateProfile(userId);
      
      return {
        style: perfil.preferences?.communicationStyle || 'neutral',
        responseLength: perfil.preferences?.responseLength || 'MEDIUM',
        topics: perfil.preferences?.topicsOfInterest || [],
        triggers: perfil.preferences?.triggerTopics || []
      };
    } catch (error) {
      console.error('Error obteniendo prompt personalizado:', error);
      return {
        style: 'neutral',
        responseLength: 'MEDIUM',
        topics: [],
        triggers: []
      };
    }
  }

  async updatePreferences(userId, newPreferences) {
    try {
      return await UserProfile.findOneAndUpdate(
        { userId },
        { 
          $set: { 
            'preferences': {
              ...newPreferences,
              lastUpdate: new Date()
            }
          }
        },
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error('Error actualizando preferencias:', error);
      return null;
    }
  }

  async shouldGenerateInsight(userId, contexto) {
    try {
      const perfil = await this.getOrCreateProfile(userId);
      const ultimaInteraccion = perfil.metadata?.ultimaInteraccion;
      const ahora = new Date();
      
      // Generar insight si:
      // 1. Han pasado más de 24 horas desde la última interacción
      // 2. Ha habido un cambio emocional significativo
      // 3. Se han completado al menos 5 sesiones desde el último insight
      
      const horasDesdeUltimaInteraccion = ultimaInteraccion ? 
        (ahora - new Date(ultimaInteraccion)) / (1000 * 60 * 60) : 24;

      return horasDesdeUltimaInteraccion >= 24 || 
             contexto?.emotional?.intensity >= 8 ||
             (perfil.metadata?.sesionesCompletadas % 5 === 0);
    } catch (error) {
      console.error('Error evaluando generación de insight:', error);
      return false;
    }
  }

  async getEmotionalPatterns(userId) {
    try {
      const perfil = await this.getOrCreateProfile(userId);
      const patronesEmocionales = perfil.patrones?.emocionales || [];
      
      // Analizar los últimos 7 días
      const ultimaSemana = new Date();
      ultimaSemana.setDate(ultimaSemana.getDate() - 7);
      
      const patronesRecientes = patronesEmocionales.filter(p => 
        new Date(p.timestamp) >= ultimaSemana
      );

      return {
        predominante: this.calcularEmocionPredominante(patronesRecientes),
        intensidadPromedio: this.calcularIntensidadPromedio(patronesRecientes),
        tendencia: this.calcularTendencia(patronesRecientes),
        patrones: patronesRecientes
      };
    } catch (error) {
      console.error('Error obteniendo patrones emocionales:', error);
      return {
        predominante: 'neutral',
        intensidadPromedio: 5,
        tendencia: 'estable',
        patrones: []
      };
    }
  }

  calcularEmocionPredominante(patrones) {
    if (!patrones.length) return 'neutral';
    
    const conteo = patrones.reduce((acc, p) => {
      acc[p.emocion] = (acc[p.emocion] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(conteo)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  calcularIntensidadPromedio(patrones) {
    if (!patrones.length) return 5;
    
    const suma = patrones.reduce((acc, p) => acc + p.intensidad, 0);
    return Math.round(suma / patrones.length);
  }

  calcularTendencia(patrones) {
    if (patrones.length < 2) return 'estable';
    
    const ordenados = [...patrones].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    const primeraIntensidad = ordenados[0].intensidad;
    const ultimaIntensidad = ordenados[ordenados.length - 1].intensidad;
    
    if (ultimaIntensidad - primeraIntensidad > 2) return 'ascendente';
    if (primeraIntensidad - ultimaIntensidad > 2) return 'descendente';
    return 'estable';
  }

  async actualizarPatronesConexion(userId) {
    try {
      const periodo = this.determinarPeriodo();
      const diaSemana = this.obtenerDiaSemana();
      
      const update = {
        $inc: {
          [`patrones.conexion.periodos.${periodo.nombre}`]: 1,
          [`patrones.conexion.diasSemana.${diaSemana}`]: 1
        },
        $set: {
          'patrones.conexion.ultimaConexion': new Date()
        },
        $push: {
          'patrones.conexion.historial': {
            periodo: periodo.nombre,
            diaSemana,
            timestamp: new Date()
          }
        }
      };

      return await UserProfile.findOneAndUpdate(
        { userId },
        update,
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error('Error en patrones de conexión:', error);
      return null;
    }
  }

  async actualizarPatronesEmocionales(userId, mensaje) {
    try {
      const analisis = await emotionalAnalyzer.analyzeEmotion(mensaje);
      const periodo = this.determinarPeriodo();

      const patronEmocional = {
        emocion: analisis.emotion,
        intensidad: analisis.intensity,
        periodo: periodo.nombre,
        timestamp: new Date(),
        contexto: analisis.emotionalState
      };

      const update = {
        $push: {
          'patrones.emocionales.historial': {
            $each: [patronEmocional],
            $slice: -50
          }
        },
        $set: {
          'patrones.emocionales.actual': patronEmocional
        }
      };

      // Actualizar frecuencias emocionales
      update.$inc = {
        [`patrones.emocionales.frecuencias.${analisis.emotion}`]: 1,
        [`patrones.emocionales.intensidades.${this.categorizarIntensidad(analisis.intensity)}`]: 1
      };

      return await UserProfile.findOneAndUpdate(
        { userId },
        update,
        { new: true }
      );
    } catch (error) {
      console.error('Error en patrones emocionales:', error);
      return null;
    }
  }

  async actualizarPatronesCognitivos(userId, mensaje) {
    try {
      const patrones = await this.analizarPatronesCognitivos(mensaje);
      
      const update = {
        $push: {
          'patrones.cognitivos.historial': {
            patrones,
            timestamp: new Date()
          }
        }
      };

      // Actualizar frecuencias de patrones cognitivos
      Object.entries(patrones).forEach(([tipo, presencia]) => {
        if (presencia) {
          update.$inc = {
            ...update.$inc,
            [`patrones.cognitivos.frecuencias.${tipo}`]: 1
          };
        }
      });

      return await UserProfile.findOneAndUpdate(
        { userId },
        update,
        { new: true }
      );
    } catch (error) {
      console.error('Error en patrones cognitivos:', error);
      return null;
    }
  }

  async actualizarEstrategiasAfrontamiento(userId, mensaje, contexto) {
    try {
      const estrategias = await this.identificarEstrategiasAfrontamiento(mensaje);
      
      const update = {
        $push: {
          'estrategias.historial': {
            estrategias,
            contexto,
            efectividad: contexto.efectividad || null,
            timestamp: new Date()
          }
        }
      };

      // Actualizar estadísticas de estrategias
      estrategias.forEach(estrategia => {
        update.$inc = {
          ...update.$inc,
          [`estrategias.frecuencias.${estrategia.tipo}`]: 1
        };
      });

      return await UserProfile.findOneAndUpdate(
        { userId },
        update,
        { new: true }
      );
    } catch (error) {
      console.error('Error en estrategias de afrontamiento:', error);
      return null;
    }
  }

  async generarInsights(userId) {
    try {
      const perfil = await UserProfile.findOne({ userId });
      const mensajesRecientes = await Message.find({
        userId,
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }).sort({ timestamp: 1 });

      const analisis = {
        perfil: this.prepararPerfilParaAnalisis(perfil),
        mensajes: mensajesRecientes,
        dimensiones: DIMENSIONES_ANALISIS
      };

      const completion = await openaiService.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `Analiza el perfil del usuario y genera insights profundos sobre:
              1. Patrones de comportamiento y su evolución
              2. Estrategias de afrontamiento efectivas
              3. Áreas de desarrollo personal
              4. Recomendaciones personalizadas
              5. Tendencias y cambios significativos
              
              Responde en formato JSON estructurado.`
          },
          {
            role: 'user',
            content: JSON.stringify(analisis)
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error generando insights:', error);
      return null;
    }
  }

  determinarPeriodo() {
    const hora = new Date().getHours();
    return Object.values(PERIODOS).find(
      periodo => hora >= periodo.inicio && hora <= periodo.fin
    ) || PERIODOS.TARDE;
  }

  obtenerDiaSemana() {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date().getDay()];
  }

  categorizarIntensidad(intensidad) {
    if (intensidad >= 8) return 'alta';
    if (intensidad >= 4) return 'media';
    return 'baja';
  }

  async analizarPatronesCognitivos(mensaje) {
    const patrones = {
      distorsiones: /(?:siempre|nunca|todo|nada|debería|tengo que)/i,
      autocritica: /(?:mi culpa|soy un|no sirvo|no puedo)/i,
      catastrofizacion: /(?:terrible|horrible|desastre|lo peor)/i,
      generalizacion: /(?:todos|nadie|siempre|jamás|típico)/i
    };

    return Object.entries(patrones).reduce((acc, [tipo, patron]) => {
      acc[tipo] = patron.test(mensaje.content);
      return acc;
    }, {});
  }

  async identificarEstrategiasAfrontamiento(mensaje) {
    const estrategias = {
      activas: /(?:intenté|busqué|decidí|resolví|afronté)/i,
      evitativas: /(?:evité|preferí no|mejor no|dejé de)/i,
      apoyo: /(?:pedí ayuda|hablé con|busqué apoyo|consulté)/i,
      reflexivas: /(?:pensé en|analicé|consideré|reflexioné)/i
    };

    return Object.entries(estrategias)
      .filter(([, patron]) => patron.test(mensaje.content))
      .map(([tipo]) => ({
        tipo,
        timestamp: new Date()
      }));
  }

  prepararPerfilParaAnalisis(perfil) {
    if (!perfil) return null;

    return {
      patrones: {
        emocionales: this.analizarPatronesEmocionales(perfil.patrones?.emocionales),
        cognitivos: this.analizarPatronesCognitivos(perfil.patrones?.cognitivos),
        conductuales: this.analizarPatronesConductuales(perfil.estrategias)
      },
      tendencias: this.analizarTendencias(perfil),
      progreso: this.evaluarProgreso(perfil)
    };
  }
}

export default new UserProfileService(); 