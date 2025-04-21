import UserProgress from '../models/UserProgress.js';

const progressTracker = {
  dimensiones: {
    AUTOCONCIENCIA: {
      descripcion: "Desarrollo de la autoconciencia emocional y cognitiva",
      niveles: {
        INICIAL: {
          descripcion: "Reconocimiento básico de emociones",
          puntos: 1
        },
        INTERMEDIO: {
          descripcion: "Comprensión de patrones emocionales",
          puntos: 2
        },
        AVANZADO: {
          descripcion: "Integración emocional-cognitiva",
          puntos: 3
        }
      },
      patrones: {
        reconocimiento: /(?:me siento|siento que|estoy|me encuentro)/i,
        comprension: /(?:porque|debido a|cuando|me di cuenta)/i,
        integracion: /(?:entiendo que|comprendo que|ahora veo|me ayuda a)/i
      }
    },
    
    REGULACION_EMOCIONAL: {
      descripcion: "Capacidad de gestión emocional",
      niveles: {
        INICIAL: {
          descripcion: "Identificación de detonantes",
          puntos: 1
        },
        INTERMEDIO: {
          descripcion: "Aplicación de estrategias",
          puntos: 2
        },
        AVANZADO: {
          descripcion: "Autorregulación adaptativa",
          puntos: 3
        }
      },
      patrones: {
        identificacion: /(?:me afecta|me genera|me provoca|me hace)/i,
        estrategias: /(?:intento|trato de|busco|me ayuda)/i,
        adaptacion: /(?:logré|conseguí|pude|he podido)/i
      }
    },

    COGNICION: {
      descripcion: "Patrones de pensamiento y creencias",
      niveles: {
        INICIAL: {
          descripcion: "Reconocimiento de pensamientos",
          puntos: 1
        },
        INTERMEDIO: {
          descripcion: "Análisis de creencias",
          puntos: 2
        },
        AVANZADO: {
          descripcion: "Reestructuración cognitiva",
          puntos: 3
        }
      },
      patrones: {
        reconocimiento: /(?:pienso|creo|considero|me parece)/i,
        analisis: /(?:antes pensaba|me doy cuenta|quizás|tal vez)/i,
        reestructuracion: /(?:ahora entiendo|he cambiado|veo diferente|otra perspectiva)/i
      }
    },

    RELACIONES: {
      descripcion: "Desarrollo de habilidades interpersonales",
      niveles: {
        INICIAL: {
          descripcion: "Reconocimiento de patrones relacionales",
          puntos: 1
        },
        INTERMEDIO: {
          descripcion: "Comunicación efectiva",
          puntos: 2
        },
        AVANZADO: {
          descripcion: "Gestión de relaciones",
          puntos: 3
        }
      },
      patrones: {
        reconocimiento: /(?:con otros|en mis relaciones|cuando hablo|al interactuar)/i,
        comunicacion: /(?:expresé|comuniqué|dije|hablé)/i,
        gestion: /(?:establecí límites|negocié|acordamos|resolvimos)/i
      }
    }
  },

  async trackProgress(userId, message, context = {}) {
    try {
      const analisis = await this.analizarProgreso(message, context);
      const actualizacion = await this.actualizarProgreso(userId, analisis);
      return this.generarReporte(actualizacion);
    } catch (error) {
      console.error('Error en seguimiento de progreso:', error);
      return null;
    }
  },

  async analizarProgreso(message, context) {
    const progreso = {
      dimensiones: {},
      timestamp: new Date(),
      contexto: context
    };

    for (const [dimension, config] of Object.entries(this.dimensiones)) {
      const analisisDimension = this.analizarDimension(message.content, config);
      if (analisisDimension.detectado) {
        progreso.dimensiones[dimension] = analisisDimension;
      }
    }

    return progreso;
  },

  analizarDimension(contenido, configuracion) {
    const resultado = {
      detectado: false,
      nivel: null,
      patrones: [],
      puntos: 0
    };

    for (const [nivel, patronesNivel] of Object.entries(configuracion.patrones)) {
      if (patronesNivel.test(contenido)) {
        resultado.detectado = true;
        resultado.patrones.push(nivel);
        resultado.puntos += configuracion.niveles[this.getNivelCorrespondiente(nivel)].puntos;
      }
    }

    if (resultado.detectado) {
      resultado.nivel = this.calcularNivel(resultado.puntos);
    }

    return resultado;
  },

  getNivelCorrespondiente(patron) {
    const mapeoNiveles = {
      reconocimiento: 'INICIAL',
      identificacion: 'INICIAL',
      comprension: 'INTERMEDIO',
      estrategias: 'INTERMEDIO',
      integracion: 'AVANZADO',
      adaptacion: 'AVANZADO',
      analisis: 'INTERMEDIO',
      reestructuracion: 'AVANZADO',
      comunicacion: 'INTERMEDIO',
      gestion: 'AVANZADO'
    };
    return mapeoNiveles[patron] || 'INICIAL';
  },

  calcularNivel(puntos) {
    if (puntos >= 6) return 'AVANZADO';
    if (puntos >= 3) return 'INTERMEDIO';
    return 'INICIAL';
  },

  async actualizarProgreso(userId, analisis) {
    const update = {
      $push: {
        historial: {
          timestamp: analisis.timestamp,
          dimensiones: analisis.dimensiones,
          contexto: analisis.contexto
        }
      }
    };

    // Actualizar niveles máximos alcanzados
    for (const [dimension, datos] of Object.entries(analisis.dimensiones)) {
      if (datos.detectado) {
        update.$max = {
          ...update.$max,
          [`nivelesMaximos.${dimension}`]: datos.puntos
        };
      }
    }

    return await UserProgress.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true }
    );
  },

  generarReporte(actualizacion) {
    if (!actualizacion) return null;

    const ultimoRegistro = actualizacion.historial[actualizacion.historial.length - 1];
    const nivelesMaximos = actualizacion.nivelesMaximos || {};

    return {
      progreso: {
        dimensiones: Object.entries(ultimoRegistro.dimensiones).map(([dimension, datos]) => ({
          dimension,
          nivel: datos.nivel,
          patrones: datos.patrones,
          nivelMaximo: this.calcularNivel(nivelesMaximos[dimension] || 0)
        })),
        timestamp: ultimoRegistro.timestamp
      },
      tendencias: this.analizarTendencias(actualizacion.historial),
      recomendaciones: this.generarRecomendaciones(ultimoRegistro.dimensiones, nivelesMaximos)
    };
  },

  analizarTendencias(historial) {
    if (!historial.length) return {};

    const ultimos = historial.slice(-5);
    const tendencias = {};

    ultimos.forEach(registro => {
      Object.entries(registro.dimensiones).forEach(([dimension, datos]) => {
        if (!tendencias[dimension]) {
          tendencias[dimension] = {
            frecuencia: 0,
            niveles: []
          };
        }
        tendencias[dimension].frecuencia++;
        tendencias[dimension].niveles.push(datos.nivel);
      });
    });

    return tendencias;
  },

  generarRecomendaciones(dimensionesActuales, nivelesMaximos) {
    const recomendaciones = [];

    Object.entries(dimensionesActuales).forEach(([dimension, datos]) => {
      const nivelMaximo = this.calcularNivel(nivelesMaximos[dimension] || 0);
      const config = this.dimensiones[dimension];

      if (datos.nivel !== 'AVANZADO') {
        const siguienteNivel = datos.nivel === 'INICIAL' ? 'INTERMEDIO' : 'AVANZADO';
        recomendaciones.push({
          dimension,
          sugerencia: `Continuar desarrollando ${config.descripcion.toLowerCase()}`,
          siguienteNivel: config.niveles[siguienteNivel].descripcion
        });
      }
    });

    return recomendaciones;
  }
};

export default progressTracker; 