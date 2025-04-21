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

  async analizarMensaje(mensaje) {
    if (!mensaje?.content) {
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
      console.error('Error en análisis de mensaje:', error);
      return this.getAnalisisDefault();
    }
  }

  analizarContenidoActual(mensaje) {
    const contenido = mensaje.content.toLowerCase();
    return {
      intencion: this.detectarIntencion(contenido),
      tema: this.detectarTema(contenido),
      urgencia: this.evaluarUrgencia(contenido)
    };
  }

  detectarIntencion(contenido) {
    try {
      for (const [tipo, patrones] of Object.entries(this.intenciones)) {
        if (patrones.some(patron => new RegExp(patron, 'i').test(contenido))) {
          return {
            tipo,
            confianza: 0.8,
            requiereSeguimiento: ['CRISIS', 'AYUDA_EMOCIONAL'].includes(tipo)
          };
        }
      }
    } catch (error) {
      console.error('Error en detección de intención:', error);
    }
    return this.defaultValues.intencion;
  }

  detectarTema(contenido) {
    try {
      for (const [categoria, patrones] of Object.entries(this.temas)) {
        if (patrones.some(patron => new RegExp(patron, 'i').test(contenido))) {
          return {
            categoria,
            subtema: null,
            confianza: 0.8
          };
        }
      }
    } catch (error) {
      console.error('Error en detección de tema:', error);
    }
    return this.defaultValues.tema;
  }

  evaluarUrgencia(contenido) {
    const patronesUrgencia = ['urgente', 'emergencia', 'crisis', 'ayuda.*ahora', 'grave'];
    return patronesUrgencia.some(patron => new RegExp(patron, 'i').test(contenido)) 
      ? 'ALTA' 
      : 'NORMAL';
  }

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