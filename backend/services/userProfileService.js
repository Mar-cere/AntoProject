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
      
      await UserProfile.findOneAndUpdate(
        { userId },
        {
          $inc: {
            [`emotionalPatterns.predominantEmotions.$[emotion].frequency`]: 1,
            [`emotionalPatterns.predominantEmotions.$[emotion].timePattern.${timeOfDay}`]: 1
          },
          $set: {
            'timePatterns.lastActive': new Date()
          }
        },
        {
          arrayFilters: [{ 'emotion.emotion': emotion }],
          upsert: true,
          new: true
        }
      );
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