import UserProfile from '../models/UserProfile.js';

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
};

const personalizationService = {
  async getPersonalizedPrompt(userId) {
    try {
      const userProfile = await UserProfile.findOne({ userId });
      if (!userProfile) return null;

      const timeOfDay = getTimeOfDay();
      const greetings = {
        morning: 'Buenos días',
        afternoon: 'Buenas tardes',
        evening: 'Buenas tardes',
        night: 'Buenas noches'
      };

      // Obtener el estilo según la hora del día
      const timeBasedStyle = {
        morning: 'motivacional',
        afternoon: 'analítico',
        evening: 'empático',
        night: 'reconfortante'
      };

      return {
        greeting: greetings[timeOfDay],
        style: userProfile.preferences.communicationStyle || timeBasedStyle[timeOfDay],
        responseLength: userProfile.preferences.responseLength,
        preferredTopics: userProfile.preferences.topics.preferred,
        timeContext: timeOfDay
      };
    } catch (error) {
      console.error('Error obteniendo perfil personalizado:', error);
      return null;
    }
  },

  async updateInteractionPattern(userId, emotion, topic) {
    try {
      const timeOfDay = getTimeOfDay();
      const interactionField = `${timeOfDay}Interactions`;

      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { [`timePatterns.${interactionField}.frequency`]: 1 },
          $set: { 
            'timePatterns.lastActive': new Date(),
            [`timePatterns.${interactionField}.averageMood`]: emotion
          },
          $push: {
            lastInteractions: {
              $each: [{ timestamp: new Date(), emotion, topic }],
              $slice: -10 // Mantener solo las últimas 10 interacciones
            }
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error actualizando patrón de interacción:', error);
    }
  }
};

export default personalizationService; 