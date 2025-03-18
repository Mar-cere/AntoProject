import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OPENAI_API_KEY, OPENAI_API_URL } from './openai';

// Cliente de OpenAI para análisis de sentimientos
const sentimentClient = axios.create({
  baseURL: OPENAI_API_URL,
  timeout: 15000, // 15 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  }
});

/**
 * Analiza el sentimiento de los mensajes del usuario
 * @param {Array} messages - Array de mensajes del chat
 * @returns {Object} Análisis de sentimiento con emoción principal, intensidad, nivel de angustia y temas
 */
export const analyzeSentiment = async (messages) => {
  try {
    // Obtener solo los últimos 3 mensajes del usuario para el análisis
    const recentUserMessages = messages
      .filter(msg => msg.sender === 'user')
      .slice(-3)
      .map(msg => msg.text)
      .join('\n');
    
    // Si no hay mensajes suficientes, retornar null
    if (!recentUserMessages || recentUserMessages.length < 10) {
      return null;
    }
    
    // Verificar si ya tenemos un análisis reciente para estos mensajes
    const cachedAnalysis = await getCachedAnalysis(recentUserMessages);
    if (cachedAnalysis) {
      return cachedAnalysis;
    }
    
    // Crear prompt para el análisis de sentimiento
    const prompt = `
      Analiza el siguiente texto y extrae:
      1. La emoción principal que expresa el usuario (una sola palabra o frase corta)
      2. La intensidad de esa emoción en una escala del 1 al 10
      3. El nivel de angustia o malestar en una escala del 1 al 10
      4. Los temas principales mencionados (máximo 3, separados por comas)
      
      Responde en formato JSON con las siguientes claves exactas: 
      "emocion_principal", "intensidad", "nivel_de_angustia", "temas_detectados"
      
      Texto a analizar: "${recentUserMessages}"
    `;
    
    // Llamar a la API de OpenAI para análisis
    const response = await sentimentClient.post('', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Eres un analizador de sentimientos preciso y objetivo. Tu tarea es extraer información emocional de textos.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 150,
      temperature: 0.3 // Baja temperatura para respuestas más consistentes
    });
    
    // Extraer y parsear la respuesta JSON
    const responseText = response.data.choices[0].message.content.trim();
    let sentimentData;
    
    try {
      // Intentar extraer JSON de la respuesta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sentimentData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No se encontró formato JSON en la respuesta');
      }
    } catch (parseError) {
      console.error('Error al parsear respuesta de análisis:', parseError);
      
      // Fallback: crear un objeto con valores por defecto
      sentimentData = {
        emocion_principal: extractEmotion(responseText),
        intensidad: extractNumber(responseText, 'intensidad') || 5,
        nivel_de_angustia: extractNumber(responseText, 'angustia') || 3,
        temas_detectados: extractThemes(responseText)
      };
    }
    
    // Normalizar los datos
    const normalizedData = {
      emocion_principal: sentimentData.emocion_principal || 'neutral',
      intensidad: parseInt(sentimentData.intensidad) || 5,
      nivel_de_angustia: parseInt(sentimentData.nivel_de_angustia) || 3,
      temas_detectados: sentimentData.temas_detectados || 'conversación general'
    };
    
    // Guardar en caché para futuras referencias
    await cacheAnalysis(recentUserMessages, normalizedData);
    
    // Guardar en historial de emociones
    await saveEmotionalState(normalizedData);
    
    return normalizedData;
  } catch (error) {
    console.error('Error en análisis de sentimiento:', error);
    
    // Retornar un análisis básico en caso de error
    return {
      emocion_principal: 'indeterminado',
      intensidad: 5,
      nivel_de_angustia: 3,
      temas_detectados: 'conversación general'
    };
  }
};

/**
 * Guarda el estado emocional actual en el historial
 * @param {Object} emotionalState - Estado emocional a guardar
 */
const saveEmotionalState = async (emotionalState) => {
  try {
    // Obtener historial existente
    const historyData = await AsyncStorage.getItem('emotionalHistory');
    let history = historyData ? JSON.parse(historyData) : [];
    
    // Añadir nuevo estado con timestamp
    history.push({
      ...emotionalState,
      timestamp: Date.now()
    });
    
    // Mantener solo los últimos 50 estados
    if (history.length > 50) {
      history = history.slice(-50);
    }
    
    // Guardar historial actualizado
    await AsyncStorage.setItem('emotionalHistory', JSON.stringify(history));
  } catch (error) {
    console.error('Error al guardar estado emocional:', error);
  }
};

/**
 * Obtiene análisis de sentimiento de la caché si existe
 * @param {string} text - Texto a analizar
 * @returns {Object|null} Análisis cacheado o null si no existe
 */
const getCachedAnalysis = async (text) => {
  try {
    const cacheKey = `sentiment_${hashString(text)}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);
    
    if (cachedData) {
      const { timestamp, data } = JSON.parse(cachedData);
      
      // Verificar si el análisis tiene menos de 5 minutos
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error al obtener análisis cacheado:', error);
    return null;
  }
};

/**
 * Guarda análisis de sentimiento en caché
 * @param {string} text - Texto analizado
 * @param {Object} analysis - Resultado del análisis
 */
const cacheAnalysis = async (text, analysis) => {
  try {
    const cacheKey = `sentiment_${hashString(text)}`;
    const cacheData = {
      timestamp: Date.now(),
      data: analysis
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error al cachear análisis:', error);
  }
};

/**
 * Genera un hash simple para usar como clave de caché
 * @param {string} str - String a hashear
 * @returns {string} Hash del string
 */
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return hash.toString(16);
};

/**
 * Extrae la emoción principal de un texto no estructurado
 * @param {string} text - Texto de respuesta
 * @returns {string} Emoción extraída o valor por defecto
 */
const extractEmotion = (text) => {
  const emotionPatterns = [
    /emoción principal[:\s]+([a-zá-úñ\s]+)/i,
    /emocion principal[:\s]+([a-zá-úñ\s]+)/i,
    /principal emoción[:\s]+([a-zá-úñ\s]+)/i,
    /principal emocion[:\s]+([a-zá-úñ\s]+)/i
  ];
  
  for (const pattern of emotionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim().toLowerCase();
    }
  }
  
  // Lista de emociones comunes para buscar en el texto
  const commonEmotions = [
    'alegría', 'tristeza', 'enojo', 'miedo', 'sorpresa', 'asco',
    'ansiedad', 'calma', 'confusión', 'curiosidad', 'decepción',
    'entusiasmo', 'esperanza', 'frustración', 'gratitud', 'culpa',
    'felicidad', 'interés', 'ira', 'nostalgia', 'orgullo', 'vergüenza'
  ];
  
  for (const emotion of commonEmotions) {
    if (text.toLowerCase().includes(emotion)) {
      return emotion;
    }
  }
  
  return 'neutral';
};

/**
 * Extrae un valor numérico de un texto no estructurado
 * @param {string} text - Texto de respuesta
 * @param {string} label - Etiqueta a buscar (intensidad o angustia)
 * @returns {number|null} Valor numérico extraído o null
 */
const extractNumber = (text, label) => {
  const patterns = [
    new RegExp(`${label}[:\\s]+([0-9]+)`, 'i'),
    new RegExp(`${label}[:\\s]+([0-9]+)/10`, 'i'),
    new RegExp(`${label}[:\\s]+([0-9]+)\\s*de\\s*10`, 'i')
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1]);
      if (!isNaN(value) && value >= 0 && value <= 10) {
        return value;
      }
    }
  }
  
  return null;
};

/**
 * Extrae temas de un texto no estructurado
 * @param {string} text - Texto de respuesta
 * @returns {string} Temas extraídos o valor por defecto
 */
const extractThemes = (text) => {
  const themePatterns = [
    /temas[:\s]+([a-zá-úñ,\s]+)/i,
    /temas detectados[:\s]+([a-zá-úñ,\s]+)/i,
    /temas principales[:\s]+([a-zá-úñ,\s]+)/i
  ];
  
  for (const pattern of themePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'conversación general';
};

/**
 * Obtiene el historial emocional del usuario
 * @param {number} limit - Número máximo de registros a devolver
 * @returns {Array} Historial de estados emocionales
 */
export const getEmotionalHistory = async (limit = 10) => {
  try {
    const historyData = await AsyncStorage.getItem('emotionalHistory');
    const history = historyData ? JSON.parse(historyData) : [];
    
    // Devolver los últimos 'limit' registros
    return history.slice(-limit);
  } catch (error) {
    console.error('Error al obtener historial emocional:', error);
    return [];
  }
};

/**
 * Analiza tendencias emocionales a lo largo del tiempo
 * @returns {Object} Análisis de tendencias emocionales
 */
export const analyzeEmotionalTrends = async () => {
  try {
    const history = await getEmotionalHistory(30); // Obtener hasta 30 registros
    
    if (history.length < 3) {
      return { trend: 'insuficiente_data', message: 'Se necesitan más interacciones para analizar tendencias' };
    }
    
    // Agrupar por emociones positivas/negativas
    const positiveEmotions = ['alegría', 'felicidad', 'entusiasmo', 'calma', 'gratitud', 'esperanza'];
    const negativeEmotions = ['tristeza', 'ansiedad', 'miedo', 'ira', 'frustración', 'culpa'];
    
    // Dividir en períodos reciente y anterior
    const recentHistory = history.slice(-Math.min(5, Math.ceil(history.length / 2)));
    const olderHistory = history.slice(0, -recentHistory.length);
    
    // Calcular promedios de intensidad y angustia
    const recentAvgIntensity = average(recentHistory.map(h => h.intensidad));
    const olderAvgIntensity = olderHistory.length ? average(olderHistory.map(h => h.intensidad)) : recentAvgIntensity;
    
    const recentAvgDistress = average(recentHistory.map(h => h.nivel_de_angustia));
    const olderAvgDistress = olderHistory.length ? average(olderHistory.map(h => h.nivel_de_angustia)) : recentAvgDistress;
    
    // Contar emociones positivas y negativas
    const recentPositiveCount = recentHistory.filter(h => 
      positiveEmotions.some(e => h.emocion_principal.toLowerCase().includes(e))
    ).length;
    
    const recentNegativeCount = recentHistory.filter(h => 
      negativeEmotions.some(e => h.emocion_principal.toLowerCase().includes(e))
    ).length;
    
    // Determinar tendencia emocional
    let trend, message;
    
    if (recentAvgDistress < olderAvgDistress - 1) {
      trend = 'mejorando';
      message = 'Se observa una reducción en el nivel de angustia emocional';
    } else if (recentAvgDistress > olderAvgDistress + 1) {
      trend = 'empeorando';
      message = 'Se observa un aumento en el nivel de angustia emocional';
    } else if (recentPositiveCount > recentHistory.length / 2) {
      trend = 'positivo';
      message = 'Predominan emociones positivas en las conversaciones recientes';
    } else if (recentNegativeCount > recentHistory.length / 2) {
      trend = 'negativo';
      message = 'Predominan emociones negativas en las conversaciones recientes';
    } else {
      trend = 'estable';
      message = 'El estado emocional se mantiene relativamente estable';
    }
    
    return {
      trend,
      message,
      data: {
        recentAvgIntensity,
        olderAvgIntensity,
        recentAvgDistress,
        olderAvgDistress,
        recentPositiveCount,
        recentNegativeCount,
        totalRecent: recentHistory.length
      }
    };
  } catch (error) {
    console.error('Error al analizar tendencias emocionales:', error);
    return { trend: 'error', message: 'No se pudieron analizar las tendencias emocionales' };
  }
};

/**
 * Calcula el promedio de un array de números
 * @param {Array} arr - Array de números
 * @returns {number} Promedio
 */
const average = (arr) => {
  if (!arr.length) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

export default {
  analyzeSentiment,
  getEmotionalHistory,
  analyzeEmotionalTrends
}; 