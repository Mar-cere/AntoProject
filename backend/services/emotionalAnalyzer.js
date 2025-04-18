const emotionalAnalyzer = {
  emotions: {
    tristeza: {
      patterns: /(?:triste|deprimid|desanimad|solo|melanc|llorar)/i,
      responses: {
        validation: ["Te acompaño en este momento 💜", "Aquí estoy para escucharte 🫂"],
        questions: [
          "¿Qué te ayudaría a sentirte mejor ahora?",
          "¿Quieres hablar sobre lo que pasó?",
          "¿Desde cuándo te sientes así?"
        ]
      }
    },
    ansiedad: {
      patterns: /(?:ansios|nervios|angustia|preocup|inquiet|estres)/i,
      responses: {
        validation: ["Respira conmigo 🫂", "Vamos paso a paso 🌱"],
        questions: [
          "¿Qué te genera más ansiedad en este momento?",
          "¿Has intentado alguna técnica de respiración?",
          "¿Necesitas ayuda para calmarte?"
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

    for (const [emotion, data] of Object.entries(this.emotions)) {
      if (data.patterns.test(message.content)) {
        detectedEmotion = emotion;
        // Calcular intensidad basada en palabras intensificadoras
        intensity = message.content.match(/(?:muy|mucho|demasiado|super|tanto)/gi)?.length || 0;
        intensity = Math.min(intensity + 3, 5); // Base 3, máximo 5
        break;
      }
    }

    return {
      emotion: detectedEmotion,
      intensity,
      responses: detectedEmotion ? this.emotions[detectedEmotion].responses : null
    };
  }
};

export default emotionalAnalyzer; 