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
      content: `Analiza el siguiente mensaje y su contexto. Responde SOLO con un objeto JSON válido que contenga:
      {
        "emotionalContext": {
          "mainEmotion": string,
          "intensity": number (1-10),
          "sentiment": "positive" | "neutral" | "negative"
        },
        "topics": string[],
        "intent": string,
        "urgency": number (1-5)
      }
      
      NO incluyas comentarios, explicaciones o texto adicional fuera del JSON.
      NO uses caracteres especiales o saltos de línea dentro de los valores string.
      ASEGÚRATE de que el JSON sea válido y parseable.`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        contextPrompt,
        ...conversationHistory.slice(-3).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: 0.3, // Temperatura baja para respuestas más consistentes
      max_tokens: 150,
      response_format: { type: "json_object" } // Forzar formato JSON
    });

    let contextData;
    try {
      contextData = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parseando JSON:', parseError);
      // Retornar un contexto por defecto si hay error de parsing
      return {
        emotionalContext: {
          mainEmotion: 'neutral',
          intensity: 5,
          sentiment: 'neutral'
        },
        topics: ['general'],
        intent: 'conversation',
        urgency: 1
      };
    }

    // Validar y sanitizar el objeto JSON
    return {
      emotionalContext: {
        mainEmotion: String(contextData.emotionalContext?.mainEmotion || 'neutral'),
        intensity: Number(contextData.emotionalContext?.intensity || 5),
        sentiment: String(contextData.emotionalContext?.sentiment || 'neutral')
      },
      topics: Array.isArray(contextData.topics) ? 
        contextData.topics.map(topic => String(topic)) : ['general'],
      intent: String(contextData.intent || 'conversation'),
      urgency: Number(contextData.urgency || 1)
    };

  } catch (error) {
    console.error('Error en análisis de contexto:', error);
    // Retornar un contexto por defecto si hay error general
    return {
      emotionalContext: {
        mainEmotion: 'neutral',
        intensity: 5,
        sentiment: 'neutral'
      },
      topics: ['general'],
      intent: 'conversation',
      urgency: 1
    };
  }
};

// Función auxiliar para sanitizar strings JSON
const sanitizeJsonString = (str) => {
  return str
    .replace(/[\n\r\t]/g, ' ') // Reemplazar saltos de línea y tabs con espacios
    .replace(/\s+/g, ' ')      // Reducir múltiples espacios a uno solo
    .trim();                   // Eliminar espacios al inicio y final
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    const personalizedPrompt = await personalizationService.getPersonalizedPrompt(userId);
    const context = await analyzeMessageContext(message, conversationHistory);
    
    // Determinar la longitud apropiada de la respuesta
    const responseLength = determineResponseLength(message, context);

    const enrichedPrompt = {
      role: 'system',
      content: `Eres Anto, un asistente conversacional amigable y empático. 

      ESTILO DE CONVERSACIÓN:
      - Mantén un tono casual y natural, como en una conversación por WhatsApp
      - Usa respuestas cortas y directas cuando sea posible
      - Divide mensajes largos en varios más cortos si es necesario
      - Usa emojis ocasionalmente para dar calidez 😊
      - Evita respuestas demasiado formales o académicas
      
      LONGITUD DE RESPUESTA: ${responseLength}
      - corto: respuesta concisa y directa
      - medio: respuesta con contexto pero manteniendo la fluidez
      - largo: respuesta detallada para temas importantes
      
      CONTEXTO TEMPORAL:
      - Momento del día: ${personalizedPrompt.timeContext || 'afternoon'}
      - Saludo: ${personalizedPrompt.greeting || 'Hola'}
      
      CONTEXTO EMOCIONAL:
      - Emoción actual: ${context?.emotionalContext?.mainEmotion || 'neutral'}
      
      INSTRUCCIONES ESPECÍFICAS:
      1. Responde siempre en español
      2. Mantén la conversación fluida y natural
      3. Si el tema es complejo, sugiere dividirlo en partes más manejables
      4. Adapta tu estilo al contexto emocional del usuario`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        enrichedPrompt,
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: 0.7,
      max_tokens: RESPONSE_LENGTHS[responseLength],
      presence_penalty: 0.6,  // Favorece respuestas más variadas
      frequency_penalty: 0.5  // Evita repeticiones
    });

    // Actualizar el patrón de interacción
    await personalizationService.updateInteractionPattern(
      userId,
      context?.emotionalContext?.mainEmotion || 'neutral',
      context?.topics?.[0] || 'general'
    );

    return {
      content: completion.choices[0].message.content,
      context: context || { 
        emotionalContext: { mainEmotion: 'neutral', intensity: 5 }, 
        topics: ['general'] 
      }
    };
  } catch (error) {
    console.error('Error generando respuesta:', error);
    throw error;
  }
};

export default {
  analyzeMessageContext,
  generateAIResponse
}; 