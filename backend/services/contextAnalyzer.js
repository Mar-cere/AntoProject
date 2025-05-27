import { PATRONES_INTENCION, PATRONES_TEMA } from '../config/patrones.js';

class ContextAnalyzer {
  constructor() {
    this.intenciones = PATRONES_INTENCION;
    this.temas = PATRONES_TEMA;
    this.defaultValues = {
      intencion: {
        tipo: 'CONVERSACION_GENERAL',
        confianza: 0.5,
        requiereSeguimiento: false
      },
      tema: {
        categoria: 'GENERAL',
        subtema: null,
        confianza: 0.5
      }
    };
  }

  /**
   * Analiza el mensaje para detectar intención, tema y urgencia.
   * @param {Object} mensaje - El mensaje a analizar. Debe tener la propiedad 'content' (string).
   * @returns {Object} Análisis del mensaje.
   */
  async analizarMensaje(mensaje) {
    if (!mensaje || typeof mensaje.content !== 'string' || mensaje.content.trim().length === 0) {
      console.warn('[ContextAnalyzer] Mensaje inválido recibido en analizarMensaje:', mensaje);
      return this.getAnalisisDefault();
    }
    try {
      const contenidoActual = await this.analizarContenidoActual(mensaje);
      return {
        intencion: contenidoActual.intencion,
        tema: contenidoActual.tema,
        urgencia: contenidoActual.urgencia || 'NORMAL',
        contexto: {
          faseConversacion: 'INICIAL',
          temasRecurrentes: [],
          patronesIdentificados: []
        },
        sugerencias: []
      };
    } catch (error) {
      console.error('[ContextAnalyzer] Error en análisis de mensaje:', error, mensaje);
      return this.getAnalisisDefault();
    }
  }

  /**
   * Analiza el contenido actual del mensaje.
   * @param {Object} mensaje - El mensaje a analizar.
   * @returns {Object} Intención, tema y urgencia detectados.
   */
  analizarContenidoActual(mensaje) {
    if (!mensaje || typeof mensaje.content !== 'string') {
      console.warn('[ContextAnalyzer] Mensaje inválido en analizarContenidoActual:', mensaje);
      return {
        intencion: this.defaultValues.intencion,
        tema: this.defaultValues.tema,
        urgencia: 'NORMAL'
      };
    }
    const contenido = mensaje.content.toLowerCase();
    return {
      intencion: this.detectarIntencion(contenido),
      tema: this.detectarTema(contenido),
      urgencia: this.evaluarUrgencia(contenido)
    };
  }

  /**
   * Detecta la intención principal del mensaje.
   * @param {string} contenido - Contenido del mensaje en minúsculas.
   * @returns {Object} Intención detectada.
   */
  detectarIntencion(contenido) {
    if (typeof contenido !== 'string' || !contenido.trim()) {
      return this.defaultValues.intencion;
    }
    try {
      for (const [tipo, patrones] of Object.entries(this.intenciones)) {
        if (Array.isArray(patrones) && patrones.some(patron => new RegExp(patron, 'i').test(contenido))) {
          return {
            tipo,
            confianza: 0.8,
            requiereSeguimiento: ['CRISIS', 'AYUDA_EMOCIONAL'].includes(tipo)
          };
        }
      }
    } catch (error) {
      console.error('[ContextAnalyzer] Error en detección de intención:', error, contenido);
      return this.defaultValues.intencion;
    }
    return this.defaultValues.intencion;
  }

  /**
   * Detecta el tema principal del mensaje.
   * @param {string} contenido - Contenido del mensaje en minúsculas.
   * @returns {Object} Tema detectado.
   */
  detectarTema(contenido) {
    if (typeof contenido !== 'string' || !contenido.trim()) {
      return this.defaultValues.tema;
    }
    try {
      for (const [categoria, patrones] of Object.entries(this.temas)) {
        if (Array.isArray(patrones) && patrones.some(patron => new RegExp(patron, 'i').test(contenido))) {
          return {
            categoria,
            subtema: null,
            confianza: 0.8
          };
        }
      }
    } catch (error) {
      console.error('[ContextAnalyzer] Error en detección de tema:', error, contenido);
      return this.defaultValues.tema;
    }
    return this.defaultValues.tema;
  }

  /**
   * Evalúa la urgencia del mensaje.
   * @param {string} contenido - Contenido del mensaje en minúsculas.
   * @returns {string} Nivel de urgencia ('ALTA' o 'NORMAL').
   */
  evaluarUrgencia(contenido) {
    if (typeof contenido !== 'string' || !contenido.trim()) {
      return 'NORMAL';
    }
    const patronesUrgencia = ['urgente', 'emergencia', 'crisis', 'ayuda.*ahora', 'grave'];
    return patronesUrgencia.some(patron => new RegExp(patron, 'i').test(contenido)) 
      ? 'ALTA' 
      : 'NORMAL';
  }

  /**
   * Devuelve un análisis por defecto.
   * @returns {Object} Análisis por defecto.
   */
  getAnalisisDefault() {
    return {
      intencion: this.defaultValues.intencion,
      tema: this.defaultValues.tema,
      urgencia: 'NORMAL',
      contexto: {
        faseConversacion: 'INICIAL',
        temasRecurrentes: [],
        patronesIdentificados: []
      },
      sugerencias: []
    };
  }
}

export default new ContextAnalyzer(); 