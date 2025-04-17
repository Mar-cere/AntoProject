import OpenAI from 'openai';
import dotenv from 'dotenv';

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

const generateAIResponse = async (message, conversationHistory) => {
  try {
    // Analizar contexto del mensaje actual
    const context = await analyzeMessageContext(message, conversationHistory);
    
    // Crear prompt enriquecido con el contexto
    const enrichedPrompt = {
      role: 'system',
      content: `Eres Anto, un asistente terapéutico empático y profesional.
      
      CONTEXTO ACTUAL:
      - Emoción principal: ${context.emotionalContext.mainEmotion}
      - Intensidad emocional: ${context.emotionalContext.intensity}/10
      - Valencia emocional: ${context.emotionalContext.valence}
      - Temas actuales: ${context.topics.join(', ')}
      - Temas relacionados previos: ${context.contextualMemory.relatedTopics.join(', ')}
      
      PREFERENCIAS DEL USUARIO:
      - Estilo de comunicación: ${context.userPreferences.communicationStyle}
      - Longitud de respuesta: ${context.userPreferences.responseLength}
      - Temas de interés: ${context.userPreferences.topicsOfInterest.join(', ')}
      
      INSTRUCCIONES:
      1. Adapta tu respuesta según estas preferencias y el contexto emocional
      2. Si el usuario muestra signos de angustia elevada, ofrece técnicas de regulación emocional
      3. Mantén un tono empático pero profesional
      4. Responde siempre en español
      5. Sé conciso pero completo
      6. Valida las emociones antes de ofrecer sugerencias`
    };

    // Generar respuesta con contexto
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
      max_tokens: 500
    });

    return {
      content: completion.choices[0].message.content,
      context: context
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