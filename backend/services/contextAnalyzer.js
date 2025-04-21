const contextAnalyzer = {
  // Patrones de intención más detallados y organizados
  patronesIntencion: {
    CRISIS_EMOCIONAL: {
      patrones: /(?:crisis|emergencia|suicid|no puedo más|ayuda urgente|desesperado|sin salida)/i,
      prioridad: 10,
      requiereInmediato: true,
      tipoRespuesta: 'CONTENCION',
      seguimiento: true,
      indicadores: {
        riesgo: /(?:hacerme daño|no vale la pena|terminar todo)/i,
        urgencia: /(?:ahora|inmediato|ya no|necesito ayuda ya)/i
      }
    },
    MALESTAR_EMOCIONAL: {
      patrones: /(?:triste|ansios|deprimi|angustia|miedo|preocupa|mal|dolor emocional|agobio)/i,
      prioridad: 8,
      tipoRespuesta: 'VALIDACION',
      seguimiento: true,
      indicadores: {
        intensidad: /(?:muy|mucho|demasiado|insoportable)/i,
        duracion: /(?:siempre|todo el tiempo|constantemente)/i
      }
    },
    BUSQUEDA_AYUDA: {
      patrones: /(?:ayuda|necesito|no sé qué hacer|perdido|confundido|consejo|orientación)/i,
      prioridad: 7,
      tipoRespuesta: 'EXPLORACION',
      seguimiento: true,
      indicadores: {
        claridad: /(?:no entiendo|no sé|confuso|dudas)/i,
        recursos: /(?:herramientas|técnicas|estrategias)/i
      }
    },
    INSIGHT: {
      patrones: /(?:me di cuenta|comprendo|entiendo ahora|veo que|descubrí|realizo)/i,
      prioridad: 6,
      tipoRespuesta: 'PROFUNDIZACION',
      seguimiento: true,
      indicadores: {
        profundidad: /(?:siempre|patrón|conexión|relación)/i,
        cambio: /(?:diferente|nueva|perspectiva|forma)/i
      }
    },
    PROGRESO: {
      patrones: /(?:logré|conseguí|pude|mejor|avance|progreso|cambio positivo|mejoría)/i,
      prioridad: 6,
      tipoRespuesta: 'REFUERZO',
      seguimiento: true,
      indicadores: {
        consolidacion: /(?:mantener|continuar|seguir|sostener)/i,
        aprendizaje: /(?:aprendí|descubrí|entendí)/i
      }
    }
  },

  // Análisis de temas recurrentes
  patronesTematicos: {
    EMOCIONAL: {
      patrones: {
        primarios: /(?:sentir|emoción|estado de ánimo|humor)/i,
        especificos: {
          tristeza: /(?:tristeza|depresión|melancolía|desánimo)/i,
          ansiedad: /(?:ansiedad|nervios|preocupación|inquietud)/i,
          ira: /(?:enojo|rabia|ira|frustración)/i,
          miedo: /(?:miedo|temor|pánico|fobia)/i
        }
      },
      categoria: 'emocional',
      profundidad: ['identificación', 'expresión', 'regulación']
    },
    COGNITIVO: {
      patrones: {
        pensamientos: /(?:pienso|creo|considero|me parece)/i,
        creencias: /(?:siempre|nunca|debo|tengo que|necesito)/i,
        sesgos: /(?:seguro que|obviamente|claramente|sin duda)/i
      },
      categoria: 'cognitivo',
      profundidad: ['automático', 'reflexivo', 'metacognitivo']
    },
    RELACIONAL: {
      patrones: {
        vinculos: /(?:familia|amigos|pareja|relación|social)/i,
        dinamicas: /(?:conflicto|comunicación|cercanía|distancia)/i,
        patrones: /(?:siempre que|cada vez que|con otros|en relaciones)/i
      },
      categoria: 'relacional',
      profundidad: ['descriptivo', 'analítico', 'introspectivo']
    }
  },

  async analizarMensaje(mensaje, historial = []) {
    try {
      const analisisActual = await this.analizarContenidoActual(mensaje);
      const analisisContextual = await this.analizarContextoConversacional(historial);
      
      return this.integrarAnalisis(analisisActual, analisisContextual);
    } catch (error) {
      console.error('Error en análisis de mensaje:', error);
      return this.getAnalisisDefault();
    }
  },

  async analizarContenidoActual(mensaje) {
    const analisis = {
      intencion: this.detectarIntencion(mensaje),
      temas: this.identificarTemas(mensaje),
      patrones: this.detectarPatrones(mensaje),
      urgencia: this.evaluarUrgencia(mensaje)
    };

    return this.enriquecerAnalisis(analisis, mensaje);
  },

  detectarIntencion(mensaje) {
    let maxPrioridad = 0;
    let intencionDetectada = null;

    for (const [tipo, config] of Object.entries(this.patronesIntencion)) {
      if (config.patrones.test(mensaje.content)) {
        if (config.prioridad > maxPrioridad) {
          maxPrioridad = config.prioridad;
          intencionDetectada = {
            tipo,
            prioridad: config.prioridad,
            requiereInmediato: config.requiereInmediato || false,
            tipoRespuesta: config.tipoRespuesta,
            indicadores: this.analizarIndicadores(mensaje.content, config.indicadores)
          };
        }
      }
    }

    return intencionDetectada || this.getIntencionDefault();
  },

  identificarTemas(mensaje) {
    const temasIdentificados = new Map();

    for (const [categoria, config] of Object.entries(this.patronesTematicos)) {
      const temaAnalizado = {
        presente: false,
        subtemas: [],
        profundidad: 'descriptivo',
        patrones: []
      };

      // Análisis de patrones primarios
      if (config.patrones.primarios?.test(mensaje.content)) {
        temaAnalizado.presente = true;
      }

      // Análisis de patrones específicos
      if (config.patrones.especificos) {
        for (const [subtema, patron] of Object.entries(config.patrones.especificos)) {
          if (patron.test(mensaje.content)) {
            temaAnalizado.subtemas.push(subtema);
          }
        }
      }

      // Determinar profundidad
      temaAnalizado.profundidad = this.determinarProfundidad(
        mensaje.content,
        config.profundidad
      );

      if (temaAnalizado.presente || temaAnalizado.subtemas.length > 0) {
        temasIdentificados.set(categoria, temaAnalizado);
      }
    }

    return temasIdentificados;
  },

  async analizarContextoConversacional(historial) {
    const mensajesRecientes = historial.slice(-5);
    
    return {
      fase: this.determinarFaseConversacion(mensajesRecientes),
      trayectoriaEmocional: this.analizarTrayectoriaEmocional(mensajesRecientes),
      patrones: this.identificarPatronesRecurrentes(mensajesRecientes),
      profundidad: this.evaluarProfundidadConversacional(mensajesRecientes)
    };
  },

  determinarFaseConversacion(mensajes) {
    if (!mensajes.length) return 'INICIAL';

    const fases = {
      INICIAL: { min: 0, max: 2 },
      EXPLORACION: { min: 3, max: 5 },
      PROFUNDIZACION: { min: 6, max: 10 },
      INTEGRACION: { min: 11 }
    };

    const profundidadAcumulada = mensajes.reduce((acc, msg) => {
      return acc + this.calcularProfundidadMensaje(msg);
    }, 0);

    return Object.entries(fases).find(([, rangos]) => {
      return profundidadAcumulada >= rangos.min && 
             (!rangos.max || profundidadAcumulada <= rangos.max);
    })[0];
  },

  calcularProfundidadMensaje(mensaje) {
    const indicadoresProfundidad = {
      reflexion: /(?:porque|ya que|debido a|me di cuenta|entiendo|comprendo)/i,
      emocion: /(?:siento|me hace sentir|me afecta|me impacta)/i,
      insight: /(?:ahora veo|he descubierto|me doy cuenta|entiendo que)/i
    };

    return Object.values(indicadoresProfundidad).reduce((acc, patron) => {
      return acc + (patron.test(mensaje.content) ? 1 : 0);
    }, 1);
  },

  analizarTrayectoriaEmocional(mensajes) {
    const emociones = mensajes.map(msg => {
      return this.detectarEmocionPredominante(msg);
    });

    return {
      secuencia: emociones,
      tendencia: this.calcularTendenciaEmocional(emociones),
      variabilidad: this.calcularVariabilidadEmocional(emociones)
    };
  },

  detectarEmocionPredominante(mensaje) {
    // Implementación del análisis emocional
    return {
      emocion: 'neutral',
      intensidad: 5,
      valencia: 0
    };
  },

  getAnalisisDefault() {
    return {
      intencion: {
        tipo: 'CONVERSACIONAL',
        prioridad: 1,
        requiereInmediato: false,
        tipoRespuesta: 'EXPLORACION'
      },
      temas: new Map(),
      contexto: {
        fase: 'INICIAL',
        trayectoriaEmocional: {
          secuencia: [],
          tendencia: 'estable',
          variabilidad: 'baja'
        }
      }
    };
  }
};

export default contextAnalyzer; 