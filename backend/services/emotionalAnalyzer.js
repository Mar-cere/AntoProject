const emotionalAnalyzer = {
  emotions: {
    tristeza: {
      patterns: /(?:triste|deprimid|desanimad|solo|melanc|llorar|no me siento bien|mal)/i,
      responses: {
        validation: [
          "Entiendo que estés pasando por un momento difícil y quiero que sepas que estoy aquí para escucharte",
          "Es completamente válido sentirse así, y me importa mucho lo que estás experimentando",
          "Reconozco que no es fácil lo que estás sintiendo, y estoy aquí para acompañarte"
        ],
        questions: [
          "¿Podrías contarme más sobre lo que te está afectando?",
          "¿Qué crees que ha contribuido a que te sientas así?",
          "¿Hay algo específico que haya desencadenado estos sentimientos?"
        ],
        support: [
          "Estoy aquí para escucharte y apoyarte en este proceso",
          "Juntos podemos explorar formas de manejar esta situación",
          "Tu bienestar es importante, y estoy aquí para ayudarte"
        ]
      }
    },
    ansiedad: {
      patterns: /(?:ansios|nervios|angustia|preocup|inquiet|estres)/i,
      responses: {
        validation: [
          "Entiendo que la ansiedad puede ser muy abrumadora, y reconozco lo que estás sintiendo",
          "Es natural sentirse ansioso, y valido tu experiencia en este momento",
          "La ansiedad puede ser muy intensa, y estoy aquí para apoyarte"
        ],
        questions: [
          "¿Qué sensaciones estás experimentando en este momento?",
          "¿Hay algo específico que te esté generando esta ansiedad?",
          "¿Qué suele ayudarte cuando te sientes así?"
        ]
      }
    },
    frustración: {
      patterns: /(?:frustrad|molest|enoj|rabia|impotencia|no puedo)/i,
      responses: {
        validation: ["Es comprensible sentirse así 💪", "Vamos a manejarlo juntos 🤝"],
        questions: [
          "¿Qué te está frustrando específicamente?",
          "¿Qué has intentado hasta ahora?",
          "¿Cómo puedo ayudarte?"
        ]
      }
    }
  },

  async analyzeEmotion(message) {
    let detectedEmotion = null;
    let intensity = 0;
    let responseType = 'standard';

    // Análisis más detallado del mensaje
    const words = message.content.toLowerCase().split(' ');
    const urgentPatterns = /(?:ayuda|urgente|crisis|emergencia|no puedo más)/i;
    const intensifiers = /(?:muy|mucho|demasiado|super|tanto)/gi;

    for (const [emotion, data] of Object.entries(this.emotions)) {
      if (data.patterns.test(message.content)) {
        detectedEmotion = emotion;
        intensity = (message.content.match(intensifiers)?.length || 0) * 2 + 5;
        
        if (urgentPatterns.test(message.content)) {
          responseType = 'urgent';
          intensity = Math.min(intensity + 3, 10);
        }
        break;
      }
    }

    return {
      emotion: detectedEmotion,
      intensity: Math.min(intensity, 10),
      responseType,
      responses: detectedEmotion ? this.emotions[detectedEmotion].responses : null
    };
  }
};

export default emotionalAnalyzer; 