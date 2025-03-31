import AsyncStorage from '@react-native-async-storage/async-storage';

// Seguimiento del progreso terapéutico
export const trackTherapyProgress = async (newMessage, sentimentAnalysis) => {
  try {
    // Obtener datos de seguimiento existentes
    const progressData = await AsyncStorage.getItem('therapyProgressData');
    let progress = progressData ? JSON.parse(progressData) : {
      sessions: 0,
      emotionalStates: [],
      topics: {},
      improvements: {},
      lastSessionDate: null
    };
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    // Verificar si es una nueva sesión
    if (progress.lastSessionDate !== currentDate) {
      progress.sessions += 1;
      progress.lastSessionDate = currentDate;
    }
    
    // Registrar estado emocional si hay análisis de sentimiento
    if (sentimentAnalysis) {
      progress.emotionalStates.push({
        date: new Date().toISOString(),
        emotion: sentimentAnalysis.emocion_principal,
        intensity: sentimentAnalysis.intensidad,
        distress: sentimentAnalysis.nivel_de_angustia
      });
      
      // Limitar a los últimos 30 estados emocionales
      if (progress.emotionalStates.length > 30) {
        progress.emotionalStates.shift();
      }
      
      // Actualizar temas discutidos
      sentimentAnalysis.temas_detectados.split(',').forEach(topic => {
        topic = topic.trim();
        if (topic) {
          progress.topics[topic] = (progress.topics[topic] || 0) + 1;
        }
      });
    }
    
    // Guardar datos actualizados
    await AsyncStorage.setItem('therapyProgressData', JSON.stringify(progress));
    return progress;
  } catch (error) {
    console.error('Error al rastrear progreso terapéutico:', error);
    return null;
  }
}; 