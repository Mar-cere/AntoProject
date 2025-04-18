import UserProfile from '../models/UserProfile.js';
import Message from '../models/Message.js';
import openaiService from './openaiService.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';

const userProfileService = {
  async updateConnectionPattern(userId) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    await UserProfile.findOneAndUpdate(
      { userId },
      {
        $inc: { [`connectionPatterns.timeSlots.$[slot].frequency`]: 1 },
        $set: { 'connectionPatterns.lastActive': now }
      },
      {
        arrayFilters: [{ 'slot.hour': hour, 'slot.dayOfWeek': dayOfWeek }],
        upsert: true
      }
    );
  },

  async updateEmotionalPattern(userId, message) {
    try {
      const analysis = await emotionalAnalyzer.analyzeEmotion(message);
      const hour = new Date().getHours();
      const timeOfDay = hour >= 6 && hour < 12 ? 'morning' :
                       hour >= 12 && hour < 18 ? 'afternoon' :
                       hour >= 18 && hour < 24 ? 'evening' : 'night';

      const emotion = analysis?.emotion || 'neutral';
      
      // Primero, intentamos encontrar el documento
      let userProfile = await UserProfile.findOne({ userId });
      
      if (!userProfile) {
        // Si no existe, creamos uno nuevo con la estructura inicial
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
        // Si existe, actualizamos el documento
        const emotionExists = userProfile.emotionalPatterns?.predominantEmotions?.some(
          e => e.emotion === emotion
        );

        if (emotionExists) {
          // Si la emoción ya existe, actualizamos sus contadores
          await UserProfile.findOneAndUpdate(
            { 
              userId,
              'emotionalPatterns.predominantEmotions.emotion': emotion 
            },
            {
              $inc: {
                'emotionalPatterns.predominantEmotions.$.frequency': 1,
                [`emotionalPatterns.predominantEmotions.$.timePattern.${timeOfDay}`]: 1
              },
              $set: {
                'timePatterns.lastActive': new Date()
              }
            },
            { new: true }
          );
        } else {
          // Si la emoción no existe, la añadimos al array
          await UserProfile.findOneAndUpdate(
            { userId },
            {
              $push: {
                'emotionalPatterns.predominantEmotions': {
                  emotion: emotion,
                  frequency: 1,
                  timePattern: {
                    morning: timeOfDay === 'morning' ? 1 : 0,
                    afternoon: timeOfDay === 'afternoon' ? 1 : 0,
                    evening: timeOfDay === 'evening' ? 1 : 0,
                    night: timeOfDay === 'night' ? 1 : 0
                  }
                }
              },
              $set: {
                'timePatterns.lastActive': new Date()
              }
            },
            { new: true }
          );
        }
      }

      // Actualizar el patrón de tiempo
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

    } catch (error) {
      console.error('Error en updateEmotionalPattern:', error);
      // Log detallado para debugging
      console.error('Detalles del error:', {
        userId: userId,
        messageContent: message.content,
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack
      });
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