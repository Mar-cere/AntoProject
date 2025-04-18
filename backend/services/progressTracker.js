const progressTracker = {
  milestones: {
    EMOTIONAL_AWARENESS: {
      description: "Reconocimiento de emociones",
      levels: ["inicial", "progresando", "avanzado"],
      triggers: /(?:me siento|reconozco|darme cuenta|identifico)/i
    },
    COPING_STRATEGIES: {
      description: "Uso de estrategias de afrontamiento",
      levels: ["aprendiendo", "practicando", "dominando"],
      triggers: /(?:respiré|intenté|practiqué|usé la técnica)/i
    },
    SELF_REFLECTION: {
      description: "Capacidad de autorreflexión",
      levels: ["explorando", "desarrollando", "consolidado"],
      triggers: /(?:pienso que|me di cuenta|reflexioné|entendí)/i
    }
  },

  async trackProgress(userId, message) {
    try {
      let progress = {};
      
      // Detectar avances en diferentes áreas
      for (const [area, data] of Object.entries(this.milestones)) {
        if (data.triggers.test(message.content)) {
          progress[area] = {
            detected: true,
            timestamp: new Date(),
            content: message.content
          };
        }
      }

      if (Object.keys(progress).length > 0) {
        await UserProgress.findOneAndUpdate(
          { userId },
          {
            $push: {
              milestones: {
                timestamp: new Date(),
                areas: progress,
                message: message.content
              }
            }
          },
          { upsert: true }
        );
      }

      return progress;
    } catch (error) {
      console.error('Error tracking progress:', error);
      return {};
    }
  }
};

export default progressTracker; 