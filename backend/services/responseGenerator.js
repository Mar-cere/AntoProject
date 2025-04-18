const responseGenerator = {
  templates: {
    emotional_support: {
      structure: [
        "validation",
        "question || suggestion"
      ],
      variations: {
        morning: {
          focus: "energía y motivación",
          tone: "activador"
        },
        afternoon: {
          focus: "balance y manejo",
          tone: "equilibrado"
        },
        evening: {
          focus: "reflexión y calma",
          tone: "tranquilizador"
        }
      }
    },
    progress_recognition: {
      structure: [
        "celebration",
        "reinforcement"
      ],
      variations: {
        small: "¡Cada paso cuenta! 🌱",
        medium: "¡Excelente progreso! 💪",
        large: "¡Logro importante! 🌟"
      }
    }
  },

  async generateResponse(message, context, emotionalAnalysis) {
    const timeOfDay = this.getTimeOfDay();
    const template = this.templates.emotional_support;
    const variation = template.variations[timeOfDay];

    let response = '';
    
    if (emotionalAnalysis.emotion) {
      const { validation, questions } = emotionalAnalysis.responses;
      response = `${validation[Math.floor(Math.random() * validation.length)]} ${questions[Math.floor(Math.random() * questions.length)]}`;
    } else {
      response = "¿Cómo te puedo ayudar hoy? 😊";
    }

    return response;
  },

  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'evening';
  }
};

export default responseGenerator; 