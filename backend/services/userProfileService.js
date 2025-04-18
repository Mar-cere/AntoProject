import UserProfile from '../models/UserProfile.js';
import Message from '../models/Message.js';
import openaiService from './openaiService.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 24) return 'evening';
  return 'night';
};

const getDayOfWeek = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const userProfileService = {
  async updateConnectionPattern(userId) {
    try {
      const timeOfDay = getTimeOfDay();
      const dayOfWeek = getDayOfWeek();
      
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $inc: {
            [`connectionStats.frequentTimes.${timeOfDay}`]: 1,
            [`connectionStats.weekdayPatterns.${dayOfWeek}`]: 1
          },
          $set: {
            'connectionStats.lastConnection': new Date()
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      );
    } catch (error) {
      console.error('Error en updateConnectionPattern:', error);
    }
  },

  async updateEmotionalPattern(userId, message) {
    try {
      const analysis = await emotionalAnalyzer.analyzeEmotion(message);
      const timeOfDay = getTimeOfDay();
      const emotion = analysis?.emotion || 'neutral';
      
      let userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        userProfile = new UserProfile({
          userId,
          timePatterns: {
            morningInteractions: { frequency: 0, averageMood: 'neutral' },
            afternoonInteractions: { frequency: 0, averageMood: 'neutral' },
            eveningInteractions: { frequency: 0, averageMood: 'neutral' },
            nightInteractions: { frequency: 0, averageMood: 'neutral' },
            lastActive: new Date()
          },
          emotionalPatterns: {
            predominantEmotions: [{
              emotion: emotion,
              frequency: 1,
              timePattern: {
                morning: 0,
                afternoon: 0,
                evening: 0,
                night: 0
              }
            }]
          }
        });
        
        await userProfile.save();
      } else {
        await UserProfile.findOneAndUpdate(
          { userId },
          {
            $inc: {
              [`timePatterns.${timeOfDay}Interactions.frequency`]: 1
            },
            $set: {
              [`timePatterns.${timeOfDay}Interactions.averageMood`]: emotion,
              'timePatterns.lastActive': new Date()
            }
          },
          { new: true }
        );
      }
    } catch (error) {
      console.error('Error en updateEmotionalPattern:', error);
    }
  },

  async generateUserInsights(userId) {
    // Obtener mensajes de los últimos 30 días
    const messages = await Message.find({
      userId,
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ timestamp: 1 });

    const completion = await openaiService.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Analiza los patrones de usuario y genera insights sobre:
          1. Patrones de comportamiento
          2. Temas recurrentes
          3. Progreso emocional
          4. Estrategias efectivas
          5. Áreas de mejora
          
          Responde en formato JSON.`
        },
        {
          role: 'user',
          content: JSON.stringify(messages)
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  },

  async updateCopingStrategies(userId, strategy, effectiveness) {
    await UserProfile.findOneAndUpdate(
      { userId },
      {
        $inc: { 'copingStrategies.$[strat].usageCount': 1 },
        $set: {
          'copingStrategies.$[strat].effectiveness': effectiveness,
          'copingStrategies.$[strat].lastUsed': new Date()
        }
      },
      {
        arrayFilters: [{ 'strat.strategy': strategy }],
        upsert: true
      }
    );
  }
};

export default userProfileService; 