import UserProfile from '../models/UserProfile.js';

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
};

const DEFAULT_PROFILE = {
  greeting: '',
  style: 'empático',
  responseLength: 'medio',
  preferredTopics: ['general'],
  timeContext: ''
};

const personalizationService = {
  async getPersonalizedPrompt(userId) {
    try {
      let userProfile = await UserProfile.findOne({ userId });
      
      // Si no existe el perfil, lo creamos
      if (!userProfile) {
        userProfile = await UserProfile.create({
          userId,
          preferences: {
            communicationStyle: 'empático',
            responseLength: 'medio',
            topics: {
              preferred: ['general'],
              avoided: []
            }
          }
        });
      }

      const timeOfDay = getTimeOfDay();
      const greetings = {
        morning: 'Buenos días',
        afternoon: 'Buenas tardes',
        evening: 'Buenas tardes',
        night: 'Buenas noches'
      };

      return {
        greeting: greetings[timeOfDay],
        style: userProfile.preferences.communicationStyle,
        responseLength: userProfile.preferences.responseLength,
        preferredTopics: userProfile.preferences.topics.preferred,
        timeContext: timeOfDay
      };
    } catch (error) {
      console.error('Error obteniendo perfil personalizado:', error);
      // Retornamos un perfil por defecto en caso de error
      const timeOfDay = getTimeOfDay();
      return {
        ...DEFAULT_PROFILE,
        greeting: timeOfDay === 'morning' ? 'Buenos días' :
                 timeOfDay === 'night' ? 'Buenas noches' : 'Buenas tardes',
        timeContext: timeOfDay
      };
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
              $slice: -10
            }
          }
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      console.error('Error actualizando patrón de interacción:', error);
    }
  }
};

export default personalizationService; 