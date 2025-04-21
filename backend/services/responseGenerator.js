const responseGenerator = {
  estructurasDialogo: {
    EXPLORACION: {
      fases: ['validacion', 'exploracion', 'profundizacion'],
      patrones: {
        validacion: [
          "Entiendo que {emocion}. Es una experiencia significativa...",
          "Tiene sentido que te sientas {emocion} dada la situación...",
          "Es comprensible que esta situación te haga sentir {emocion}..."
        ],
        exploracion: [
          "¿Podrías contarme más sobre qué te lleva a sentir esto?",
          "¿Qué aspectos de la situación te impactan más?",
          "¿Qué pensamientos surgen cuando te sientes así?"
        ],
        profundizacion: [
          "¿Cómo se relaciona esto con otras experiencias similares?",
          "¿Qué significado tiene esta experiencia para ti?",
          "¿Qué te dice esta situación sobre lo que es importante para ti?"
        ]
      }
    },

    REFLEXION: {
      fases: ['reconocimiento', 'analisis', 'integracion'],
      patrones: {
        reconocimiento: [
          "Observo que has identificado {patron}...",
          "Es interesante cómo notas que {patron}...",
          "Me llama la atención tu observación sobre {patron}..."
        ],
        analisis: [
          "¿Qué te hace pensar sobre este patrón?",
          "¿Cómo influye esto en tu día a día?",
          "¿Qué papel juega esto en tu experiencia?"
        ],
        integracion: [
          "¿Cómo podría esta comprensión ayudarte?",
          "¿Qué nuevas posibilidades ves ahora?",
          "¿Qué significaría hacer las cosas de manera diferente?"
        ]
      }
    },

    ACOMPAÑAMIENTO: {
      fases: ['presencia', 'apoyo', 'perspectiva'],
      patrones: {
        presencia: [
          "Estoy aquí contigo en este momento...",
          "Te acompaño en esta experiencia...",
          "Siento la importancia de lo que compartes..."
        ],
        apoyo: [
          "¿Qué necesitas en este momento?",
          "¿Cómo puedo acompañarte mejor?",
          "¿Qué sería útil explorar juntos?"
        ],
        perspectiva: [
          "Quizás podríamos ver esto desde otro ángulo...",
          "Me pregunto si hay otras formas de entender esto...",
          "¿Qué otras perspectivas podríamos considerar?"
        ]
      }
    }
  },

  contextosTemporales: {
    madrugada: {
      enfoque: "introspección y calma",
      tono: "suave y contenedor",
      profundidad: "alta",
      estructuraPreferida: "REFLEXION"
    },
    mañana: {
      enfoque: "claridad y posibilidades",
      tono: "energético y constructivo",
      profundidad: "media",
      estructuraPreferida: "EXPLORACION"
    },
    tarde: {
      enfoque: "integración y acción",
      tono: "práctico y orientativo",
      profundidad: "media",
      estructuraPreferida: "ACOMPAÑAMIENTO"
    },
    noche: {
      enfoque: "balance y cierre",
      tono: "reflexivo y contenedor",
      profundidad: "alta",
      estructuraPreferida: "REFLEXION"
    }
  },

  async generateResponse(message, context, emotionalAnalysis) {
    try {
      const configuracion = await this.prepararConfiguracion(context, emotionalAnalysis);
      const estructura = await this.seleccionarEstructura(configuracion);
      return this.construirRespuesta(estructura, configuracion);
    } catch (error) {
      console.error('Error generando respuesta:', error);
      return this.generarRespuestaSegura();
    }
  },

  async prepararConfiguracion(context, emotionalAnalysis) {
    const periodoActual = this.determinarPeriodo();
    const contextoTemporal = this.contextosTemporales[periodoActual];
    
    return {
      periodo: periodoActual,
      contextoTemporal,
      emocion: emotionalAnalysis?.emotion || 'neutral',
      intensidad: emotionalAnalysis?.intensity || 5,
      patrones: emotionalAnalysis?.patterns || [],
      historial: context?.conversationHistory || [],
      estilo: context?.userPreferences?.communicationStyle || 'exploratorio'
    };
  },

  async seleccionarEstructura(config) {
    const { contextoTemporal, intensidad, emocion } = config;
    
    // Selección base según período
    let estructuraBase = this.estructurasDialogo[contextoTemporal.estructuraPreferida];

    // Ajustes según intensidad emocional
    if (intensidad > 7) {
      estructuraBase = this.estructurasDialogo.ACOMPAÑAMIENTO;
    }

    // Ajustes según emoción
    if (emocion === 'tristeza' || emocion === 'ansiedad') {
      estructuraBase = this.estructurasDialogo.EXPLORACION;
    }

    return estructuraBase;
  },

  construirRespuesta(estructura, config) {
    const respuesta = [];
    const { fases, patrones } = estructura;

    fases.forEach(fase => {
      const patronesFase = patrones[fase];
      const patron = this.seleccionarPatronAleatorio(patronesFase);
      
      const respuestaFase = this.personalizarPatron(patron, {
        emocion: config.emocion,
        patron: config.patrones[0] || 'esta situación',
        intensidad: config.intensidad
      });

      respuesta.push(respuestaFase);
    });

    return this.formatearRespuesta(respuesta, config);
  },

  seleccionarPatronAleatorio(patrones) {
    return patrones[Math.floor(Math.random() * patrones.length)];
  },

  personalizarPatron(patron, datos) {
    return patron
      .replace('{emocion}', datos.emocion)
      .replace('{patron}', datos.patron);
  },

  formatearRespuesta(fragmentos, config) {
    const { contextoTemporal } = config;
    
    // Ajustar formato según contexto temporal
    if (contextoTemporal.profundidad === 'alta') {
      return fragmentos.join('\n\n');
    }
    
    return fragmentos.join(' ');
  },

  determinarPeriodo() {
    const hora = new Date().getHours();
    if (hora >= 0 && hora < 6) return 'madrugada';
    if (hora >= 6 && hora < 12) return 'mañana';
    if (hora >= 12 && hora < 19) return 'tarde';
    return 'noche';
  },

  generarRespuestaSegura() {
    return "¿Cómo puedo acompañarte en este momento?";
  }
};

export default responseGenerator; 