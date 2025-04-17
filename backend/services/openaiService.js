import OpenAI from 'openai';
import dotenv from 'dotenv';
import personalizationService from './personalizationService.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const analyzeMessageContext = async (message, conversationHistory) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Analiza el mensaje y su contexto. Extrae:
          1. Temas principales y relacionados
          2. Contexto emocional
          3. Preferencias de comunicación
          4. Referencias a conversaciones previas
          
          Responde SOLO con un objeto JSON que contenga:
          {
            "topics": ["tema1", "tema2"],
            "emotionalContext": {
              "mainEmotion": "emoción",
              "intensity": número,
              "valence": "positiva/negativa/neutral"
            },
            "userPreferences": {
              "communicationStyle": "estilo",
              "responseLength": "longitud",
              "topicsOfInterest": ["tema1", "tema2"]
            },
            "contextualMemory": {
              "relatedTopics": ["tema1", "tema2"],
              "previousReferences": [
                {
                  "topic": "tema",
                  "relevance": número
                }
              ]
            }
          }`
        },
        {
          role: 'user',
          content: `Mensaje actual: ${message.content}\n\nHistorial reciente: ${JSON.stringify(conversationHistory.map(m => m.content))}`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(completion.choices[0].message.content);
  } catch (error) {
    console.error('Error en análisis de contexto:', error);
    return {
      topics: [],
      emotionalContext: {
        mainEmotion: "neutral",
        intensity: 5,
        valence: "neutral"
      },
      userPreferences: {
        communicationStyle: "neutral",
        responseLength: "medium",
        topicsOfInterest: []
      },
      contextualMemory: {
        relatedTopics: [],
        previousReferences: []
      }
    };
  }
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    const personalizedPrompt = await personalizationService.getPersonalizedPrompt(userId);
    const context = await analyzeMessageContext(message, conversationHistory);
    
    const timeBasedSuggestions = {
      morning: [
        "¿Has planificado tus objetivos para hoy?",
        "¿Qué te gustaría lograr esta mañana?",
        "Empecemos el día con energía positiva"
      ],
      afternoon: [
        "¿Cómo va tu día hasta ahora?",
        "Tomemos un momento para reflexionar sobre tu progreso",
        "¿Necesitas ayuda para manejar el estrés del día?"
      ],
      evening: [
        "¿Cómo te sientes después de tu día?",
        "Hablemos sobre lo que te preocupa antes de dormir",
        "Practiquemos algo de relajación"
      ],
      night: [
        "Es importante cuidar tu descanso",
        "Podemos hablar de lo que te mantiene despierto",
        "Practiquemos técnicas de relajación para dormir mejor"
      ]
    };

    // Asegurarnos de que tenemos sugerencias válidas
    const currentSuggestions = timeBasedSuggestions[personalizedPrompt.timeContext] || timeBasedSuggestions.afternoon;

    const enrichedPrompt = {
      role: 'system',
      content: `Eres Anto, un asistente terapéutico empático y profesional.
      
      CONTEXTO TEMPORAL:
      - Momento del día: ${personalizedPrompt.timeContext || 'afternoon'}
      - Saludo apropiado: ${personalizedPrompt.greeting || 'Hola'}
      
      PREFERENCIAS DEL USUARIO:
      - Estilo de comunicación: ${personalizedPrompt.style || 'empático'}
      - Longitud de respuesta: ${personalizedPrompt.responseLength || 'medio'}
      - Temas preferidos: ${(personalizedPrompt.preferredTopics || ['general']).join(', ')}
      
      CONTEXTO EMOCIONAL:
      - Emoción actual: ${context?.emotionalContext?.mainEmotion || 'neutral'}
      - Intensidad: ${context?.emotionalContext?.intensity || 5}/10
      
      SUGERENCIAS CONTEXTUALES:
      ${currentSuggestions.join('\n')}
      
      INSTRUCCIONES:
      1. Usa el saludo apropiado para la hora del día
      2. Adapta tu tono al estilo preferido del usuario
      3. Mantén la longitud de respuesta preferida
      4. Considera el contexto temporal para tus sugerencias
      5. Responde siempre en español
      6. Prioriza temas relevantes para este momento del día`
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
      max_tokens: personalizedPrompt.responseLength === 'corto' ? 150 :
                 personalizedPrompt.responseLength === 'medio' ? 300 : 500
    });

    // Actualizar el patrón de interacción
    await personalizationService.updateInteractionPattern(
      userId,
      context?.emotionalContext?.mainEmotion || 'neutral',
      context?.topics?.[0] || 'general'
    );

    return {
      content: completion.choices[0].message.content,
      context: context || { emotionalContext: { mainEmotion: 'neutral', intensity: 5 }, topics: ['general'] }
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