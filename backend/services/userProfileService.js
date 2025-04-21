import UserProfile from '../models/UserProfile.js';
import Message from '../models/Message.js';
import openaiService from './openaiService.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';

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

const userProfileService = {
  async actualizarPerfil(userId, mensaje, contexto = {}) {
    try {
      const actualizaciones = await Promise.all([
        this.actualizarPatronesConexion(userId),
        this.actualizarPatronesEmocionales(userId, mensaje),
        this.actualizarPatronesCognitivos(userId, mensaje),
        this.actualizarEstrategiasAfrontamiento(userId, mensaje, contexto)
      ]);

      return this.integrarActualizaciones(actualizaciones);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      return null;
    }
  },

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
  },

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
  },

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
  },

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
  },

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
  },

  determinarPeriodo() {
    const hora = new Date().getHours();
    return Object.values(PERIODOS).find(
      periodo => hora >= periodo.inicio && hora <= periodo.fin
    ) || PERIODOS.TARDE;
  },

  obtenerDiaSemana() {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return dias[new Date().getDay()];
  },

  categorizarIntensidad(intensidad) {
    if (intensidad >= 8) return 'alta';
    if (intensidad >= 4) return 'media';
    return 'baja';
  },

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
  },

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
  },

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
};

export default userProfileService; 