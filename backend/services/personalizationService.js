import UserProfile from '../models/UserProfile.js';

const PERIODOS = {
  MADRUGADA: { inicio: 0, fin: 5, nombre: 'madrugada' },
  MAÑANA: { inicio: 6, fin: 11, nombre: 'mañana' },
  MEDIODIA: { inicio: 12, fin: 14, nombre: 'mediodía' },
  TARDE: { inicio: 15, fin: 18, nombre: 'tarde' },
  NOCHE: { inicio: 19, fin: 23, nombre: 'noche' }
};

const ESTILOS_COMUNICACION = {
  EMPATICO: {
    tono: 'cálido',
    validación: true,
    reflexivo: true,
    estructurado: false
  },
  DIRECTO: {
    tono: 'claro',
    validación: false,
    reflexivo: false,
    estructurado: true
  },
  EXPLORATORIO: {
    tono: 'curioso',
    validación: true,
    reflexivo: true,
    estructurado: false
  },
  ESTRUCTURADO: {
    tono: 'organizado',
    validación: false,
    reflexivo: true,
    estructurado: true
  }
};

const personalizationService = {
  async getPersonalizedPrompt(userId, contextData = {}) {
    try {
      const userProfile = await this.getOrCreateProfile(userId);
      const periodo = this.analizarPeriodoTemporal();
      const patronesUsuario = await this.analizarPatronesUsuario(userProfile);
      
      return this.generarConfiguracionPersonalizada(userProfile, periodo, patronesUsuario, contextData);
    } catch (error) {
      console.error('Error en personalización:', error);
      return this.getDefaultConfiguration();
    }
  },

  async getOrCreateProfile(userId) {
    try {
      let userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        userProfile = await UserProfile.create({
          userId,
          preferencias: {
            estiloBase: 'EMPATICO',
            longitudRespuesta: 'MEDIA',
            temas: {
              preferidos: ['general'],
              evitados: []
            },
            adaptabilidad: {
              emocional: true,
              contextual: true,
              temporal: true
            }
          },
          patrones: {
            temporales: {},
            emocionales: {},
            tematicos: {}
          }
        });
      }
      
      return userProfile;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      throw error;
    }
  },

  analizarPeriodoTemporal() {
    const hora = new Date().getHours();
    const periodo = Object.values(PERIODOS).find(
      p => hora >= p.inicio && hora <= p.fin
    ) || PERIODOS.TARDE;

    return {
      ...periodo,
      caracteristicas: this.getCaracteristicasPeriodo(periodo.nombre)
    };
  },

  getCaracteristicasPeriodo(nombrePeriodo) {
    const caracteristicas = {
      madrugada: {
        energía: 'baja',
        profundidad: 'alta',
        longitudIdeal: 'CORTA',
        tonoPreferido: 'suave'
      },
      mañana: {
        energía: 'alta',
        profundidad: 'media',
        longitudIdeal: 'MEDIA',
        tonoPreferido: 'energético'
      },
      mediodía: {
        energía: 'media',
        profundidad: 'baja',
        longitudIdeal: 'CORTA',
        tonoPreferido: 'práctico'
      },
      tarde: {
        energía: 'media',
        profundidad: 'alta',
        longitudIdeal: 'MEDIA',
        tonoPreferido: 'reflexivo'
      },
      noche: {
        energía: 'baja',
        profundidad: 'alta',
        longitudIdeal: 'MEDIA',
        tonoPreferido: 'tranquilo'
      }
    };

    return caracteristicas[nombrePeriodo] || caracteristicas.tarde;
  },

  async analizarPatronesUsuario(userProfile) {
    const patrones = {
      emocionales: this.analizarPatronEmocional(userProfile.patrones.emocionales),
      temporales: this.analizarPatronTemporal(userProfile.patrones.temporales),
      tematicos: this.analizarPatronTematico(userProfile.patrones.tematicos)
    };

    return {
      ...patrones,
      estiloComunicacionRecomendado: this.determinarEstiloComunicacion(patrones)
    };
  },

  analizarPatronEmocional(patronesEmocionales) {
    const ultimasEmociones = patronesEmocionales?.ultimas || [];
    const tendenciaEmocional = this.calcularTendenciaEmocional(ultimasEmociones);

    return {
      tendencia: tendenciaEmocional,
      intensidad: this.calcularIntensidadEmocional(ultimasEmociones),
      estabilidad: this.calcularEstabilidadEmocional(ultimasEmociones)
    };
  },

  calcularTendenciaEmocional(emociones) {
    if (!emociones.length) return 'neutral';
    
    const frecuencias = emociones.reduce((acc, emocion) => {
      acc[emocion] = (acc[emocion] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(frecuencias)
      .sort(([,a], [,b]) => b - a)[0][0];
  },

  determinarEstiloComunicacion(patrones) {
    const { emocionales, temporales } = patrones;
    
    if (emocionales.intensidad === 'alta') {
      return ESTILOS_COMUNICACION.EMPATICO;
    }
    
    if (emocionales.estabilidad === 'baja') {
      return ESTILOS_COMUNICACION.EXPLORATORIO;
    }
    
    if (temporales.frecuencia === 'alta') {
      return ESTILOS_COMUNICACION.ESTRUCTURADO;
    }
    
    return ESTILOS_COMUNICACION.DIRECTO;
  },

  async generarConfiguracionPersonalizada(userProfile, periodo, patrones, contextData) {
    const { estiloBase } = userProfile.preferencias;
    const estiloComunicacion = patrones.estiloComunicacionRecomendado;
    const caracteristicasPeriodo = periodo.caracteristicas;

    return {
      saludos: this.generarSaludo(periodo.nombre, patrones),
      estiloComunicacion: {
        ...ESTILOS_COMUNICACION[estiloBase],
        ...estiloComunicacion,
        adaptaciones: this.generarAdaptaciones(contextData)
      },
      configuracionRespuesta: {
        longitud: this.determinarLongitudRespuesta(caracteristicasPeriodo, patrones),
        tono: this.determinarTono(caracteristicasPeriodo, patrones),
        estructura: this.determinarEstructura(patrones)
      },
      contexto: {
        periodo: periodo.nombre,
        patronesActivos: patrones,
        ultimaInteraccion: userProfile.patrones.temporales.ultima
      }
    };
  },

  async updateInteractionPattern(userId, data) {
    try {
      const { emotion, topic, interactionType, responseQuality } = data;
      const periodo = this.analizarPeriodoTemporal();

      const update = {
        $push: {
          'patrones.emocionales.ultimas': {
            $each: [emotion],
            $slice: -10
          },
          'patrones.tematicos.ultimos': {
            $each: [topic],
            $slice: -10
          }
        },
        $inc: {
          [`patrones.temporales.${periodo.nombre}.frecuencia`]: 1,
          [`patrones.tematicos.frecuencias.${topic}`]: 1
        },
        $set: {
          'patrones.temporales.ultima': new Date(),
          [`patrones.temporales.${periodo.nombre}.ultimaEmocion`]: emotion,
          'ultimaInteraccion.calidad': responseQuality
        }
      };

      await UserProfile.findOneAndUpdate({ userId }, update, { new: true });
    } catch (error) {
      console.error('Error actualizando patrón:', error);
    }
  },

  getDefaultConfiguration() {
    return {
      saludos: 'Hola',
      estiloComunicacion: ESTILOS_COMUNICACION.EMPATICO,
      configuracionRespuesta: {
        longitud: 'MEDIA',
        tono: 'neutral',
        estructura: 'flexible'
      },
      contexto: {
        periodo: 'tarde',
        patronesActivos: null,
        ultimaInteraccion: null
      }
    };
  }
};

export default personalizationService; 