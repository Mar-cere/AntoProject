import OpenAI from 'openai';
import dotenv from 'dotenv';
import personalizationService from './personalizationService.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RESPONSE_LENGTHS = {
  corto: 50,    // Respuestas rápidas y conversacionales
  medio: 150,   // Respuestas con algo más de contexto
  largo: 300    // Respuestas elaboradas para temas importantes
};

const determineResponseLength = (message, context) => {
  // Palabras clave que indican necesidad de respuesta elaborada
  const longResponseTriggers = [
    'explica', 'explícame', 'por qué', 'ayúdame a entender',
    'necesito ayuda con', 'cómo puedo', 'qué opinas sobre'
  ];

  // Palabras clave que indican respuesta corta
  const shortResponseTriggers = [
    'ok', 'sí', 'no', 'bien', 'gracias', 'entiendo',
    'claro', 'vale', '👍', '😊'
  ];

  const messageContent = message.content.toLowerCase();

  // Si el mensaje del usuario es corto y simple, responder de forma similar
  if (messageContent.split(' ').length <= 4 || 
      shortResponseTriggers.some(trigger => messageContent.includes(trigger))) {
    return 'corto';
  }

  // Si el mensaje indica necesidad de explicación o ayuda específica
  if (longResponseTriggers.some(trigger => messageContent.includes(trigger))) {
    return 'largo';
  }

  // Por defecto, usar respuestas medias para mantener la conversación fluida
  return 'medio';
};

const analyzeMessageContext = async (message, conversationHistory) => {
  try {
    const contextPrompt = {
      role: 'system',
      content: `Analiza el mensaje y responde con un objeto JSON simple.
      IMPORTANTE: SOLO devuelve el JSON, sin texto adicional.
      
      Formato requerido:
      {
        "emotion": "alegría|tristeza|enojo|neutral|preocupación|etc",
        "intensity": 1-10,
        "topic": "tema principal",
        "urgent": true|false
      }`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        contextPrompt,
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" }
    });

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(completion.choices[0].message.content.trim());
    } catch (parseError) {
      console.error('Error en el parsing inicial:', completion.choices[0].message.content);
      return getDefaultContext();
    }

    // Validar y sanitizar la respuesta
    return {
      emotionalContext: {
        mainEmotion: String(parsedResponse.emotion || 'neutral'),
        intensity: Number(parsedResponse.intensity) || 5
      },
      topics: [String(parsedResponse.topic || 'general')],
      urgent: Boolean(parsedResponse.urgent)
    };

  } catch (error) {
    console.error('Error en análisis de contexto:', error);
    return getDefaultContext();
  }
};

const getDefaultContext = () => ({
  emotionalContext: {
    mainEmotion: 'neutral',
    intensity: 5
  },
  topics: ['general'],
  urgent: false
});

// Función auxiliar para sanitizar strings JSON
const sanitizeJsonString = (str) => {
  return str
    .replace(/[\n\r\t]/g, ' ') // Reemplazar saltos de línea y tabs con espacios
    .replace(/\s+/g, ' ')      // Reducir múltiples espacios a uno solo
    .trim();                   // Eliminar espacios al inicio y final
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    // 1. Eliminamos el análisis de contexto complejo y usamos uno más simple
    const quickContext = {
      isQuestion: message.content.includes('?'),
      isGreeting: /^(hola|hi|hey|buenos días|buenas|que tal)/i.test(message.content),
      isShort: message.content.split(' ').length <= 4
    };

    // 2. Usamos un modelo más rápido para respuestas simples
    const shouldUseGPT4 = !quickContext.isShort || 
                         message.content.length > 50 || 
                         conversationHistory.length > 5;

    const enrichedPrompt = {
      role: 'system',
      content: `Eres Anto, un asistente conversacional amigable y conciso.
      
      INSTRUCCIONES CLAVE:
      - Responde siempre en español
      - Usa respuestas cortas y naturales
      - Mantén un tono casual como WhatsApp
      - Usa máximo un emoji por respuesta
      - Si el mensaje es complejo, divide la respuesta
      ${quickContext.isQuestion ? '- Da respuestas directas y útiles' : ''}
      ${quickContext.isGreeting ? '- Responde al saludo de forma amigable y breve' : ''}
      
      NO uses frases formales o académicas.
      NO des explicaciones innecesarias.
      NO uses más de 2 líneas si no es necesario.`
    };

    const completion = await openai.chat.completions.create({
      model: shouldUseGPT4 ? 'gpt-4-turbo-preview' : 'gpt-3.5-turbo',
      messages: [
        enrichedPrompt,
        // Solo incluimos los últimos 2 mensajes para contexto rápido
        ...conversationHistory.slice(-2).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: quickContext.isQuestion ? 0.3 : 0.7, // Más preciso para preguntas
      max_tokens: quickContext.isShort ? 30 : 100,     // Respuestas más cortas
      presence_penalty: 0.6,                           // Mantener variedad
      frequency_penalty: 0.5                           // Evitar repeticiones
    });

    return {
      content: completion.choices[0].message.content,
      context: quickContext
    };

  } catch (error) {
    console.error('Error generando respuesta:', error);
    // En caso de error, dar una respuesta rápida por defecto
    return {
      content: "Disculpa, ¿podrías repetir eso? 😊",
      context: { error: true }
    };
  }
};

export default {
  analyzeMessageContext,
  generateAIResponse
}; 