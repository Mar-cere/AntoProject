import UserProgress from '../models/UserProgress.js';

class ProgressTracker {
  async trackProgress(userId, mensaje) {
    try {
      const progressEntry = {
        timestamp: new Date(),
        emotionalState: {
          mainEmotion: mensaje?.metadata?.context?.emotional?.mainEmotion || 'neutral',
          intensity: mensaje?.metadata?.context?.emotional?.intensity || 5
        },
        context: {
          topic: mensaje?.metadata?.context?.contextual?.tema?.categoria || 'GENERAL',
          triggers: [],
          copingStrategies: []
        },
        sessionMetrics: {
          messageCount: 1,
          responseQuality: 3
        }
      };

      const userProgress = await UserProgress.findOneAndUpdate(
        { userId },
        {
          $push: { entries: progressEntry },
          $inc: { 'overallMetrics.totalSessions': 1 }
        },
        { new: true, upsert: true }
      );

      return userProgress;
    } catch (error) {
      console.error('Error en seguimiento de progreso:', error);
      return null;
    }
  }

  async generarReporte(userId) {
    try {
      const progress = await UserProgress.findOne({ userId });
      if (!progress || !progress.entries || progress.entries.length === 0) {
        return {
          totalSessions: 0,
          averageIntensity: 0,
          commonEmotions: [],
          commonTopics: []
        };
      }

      return {
        totalSessions: progress.entries.length,
        averageIntensity: this.calcularIntensidadPromedio(progress.entries),
        commonEmotions: this.obtenerEmocionesComunes(progress.entries),
        commonTopics: this.obtenerTemasComunes(progress.entries)
      };
    } catch (error) {
      console.error('Error generando reporte:', error);
      return null;
    }
  }

  calcularIntensidadPromedio(entries) {
    if (!entries || entries.length === 0) return 0;
    const sum = entries.reduce((acc, entry) => acc + (entry.emotionalState?.intensity || 0), 0);
    return sum / entries.length;
  }

  obtenerEmocionesComunes(entries) {
    if (!entries || entries.length === 0) return [];
    const emotions = {};
    entries.forEach(entry => {
      const emotion = entry.emotionalState?.mainEmotion || 'neutral';
      emotions[emotion] = (emotions[emotion] || 0) + 1;
    });
    return Object.entries(emotions)
      .map(([emotion, count]) => ({ emotion, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  obtenerTemasComunes(entries) {
    if (!entries || entries.length === 0) return [];
    const topics = {};
    entries.forEach(entry => {
      const topic = entry.context?.topic || 'GENERAL';
      topics[topic] = (topics[topic] || 0) + 1;
    });
    return Object.entries(topics)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

export default new ProgressTracker(); 