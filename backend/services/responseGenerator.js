class ResponseGenerator {
  constructor() {
    this.fallbackResponses = {
      general: [
        "Entiendo lo que me dices. ¿Podrías darme más detalles para ayudarte mejor?",
        "Me gustaría entender mejor tu situación. ¿Podrías explicarme un poco más?",
        "Gracias por compartir eso conmigo. ¿Qué te gustaría explorar sobre este tema?"
      ],
      error: [
        "Disculpa, tuve un pequeño inconveniente. ¿Podrías reformular tu mensaje?",
        "Lo siento, necesito un momento para procesar mejor. ¿Podrías expresarlo de otra manera?",
        "Perdón por la confusión. ¿Podrías ayudarme a entender mejor compartiendo más detalles?"
      ],
      emotional: [
        "Veo que esto es importante para ti. ¿Te gustaría contarme más sobre cómo te hace sentir?",
        "Entiendo que esta situación te afecta. ¿Qué necesitas en este momento?",
        "Estoy aquí para escucharte. ¿Cómo podría ayudarte mejor con esto?"
      ]
    };
  }

  /**
   * Genera una respuesta de respaldo según el contexto y tipo.
   * @param {Object} context - Contexto del mensaje o usuario.
   * @param {string} type - Tipo de respuesta ('general', 'error', 'emotional').
   * @returns {Promise<string>} Respuesta generada.
   */
  async generateResponse(context, type = 'general') {
    try {
      if (!type || typeof type !== 'string') type = 'general';
      const responses = this.fallbackResponses[type] || this.fallbackResponses.general;
      return responses[Math.floor(Math.random() * responses.length)];
    } catch (error) {
      console.error('[ResponseGenerator] Error generando respuesta:', error, { context, type });
      return this.fallbackResponses.error[0];
    }
  }

  /**
   * Genera una respuesta de respaldo basada en el contenido del mensaje.
   * @param {Object} mensaje - Mensaje recibido.
   * @returns {Promise<string>} Respuesta generada.
   */
  async generateFallbackResponse(mensaje) {
    try {
      if (!mensaje || typeof mensaje.content !== 'string') {
        return this.fallbackResponses.error[0];
      }
      // Detectar si el mensaje tiene contenido emocional
      const tieneContenidoEmocional = /(?:triste|feliz|enojad[oa]|ansios[oa]|preocupad[oa]|mal|bien)/i.test(mensaje.content);
      return await this.generateResponse(
        mensaje,
        tieneContenidoEmocional ? 'emotional' : 'general'
      );
    } catch (error) {
      console.error('[ResponseGenerator] Error generando respuesta fallback:', error, mensaje);
      return this.fallbackResponses.error[0];
    }
  }
}

export default new ResponseGenerator(); 