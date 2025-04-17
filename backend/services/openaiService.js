import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Servicio de OpenAI simplificado
const openaiService = {
  // Función para generar respuestas de IA
  generateAIResponse: async (userMessage, conversationHistory = []) => {
    try {
      // Formatear el historial de conversación
      const messages = [
        {
          role: 'system',
          content: `Eres Anto, un asistente psicológico empático y profesional. 
          Tu objetivo es proporcionar apoyo emocional y orientación psicológica basada en evidencia.
          Mantienes un tono cálido y comprensivo, pero siempre profesional.
          Utilizas técnicas de la TCC y otras terapias basadas en evidencia.
          Si detectas signos de crisis o riesgo, recomiendas buscar ayuda profesional.`
        },
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      });

      return {
        content: completion.choices[0].message.content,
        role: 'assistant',
        metadata: {
          model: completion.model,
          tokens: {
            total: completion.usage.total_tokens,
            prompt: completion.usage.prompt_tokens,
            completion: completion.usage.completion_tokens
          }
        }
      };
    } catch (error) {
      console.error('Error en generateAIResponse:', error);
      throw error;
    }
  },
  
  // Más funciones según sea necesario...
  analyzeEmotions: async (text) => {
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'Analiza el sentimiento y las emociones en el texto. Responde en formato JSON con: emocion_principal, intensidad (1-10), nivel_de_angustia (1-10), temas_detectados'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 150
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Error en analyzeEmotions:', error);
      return {
        emocion_principal: 'neutral',
        intensidad: 5,
        nivel_de_angustia: 3,
        temas_detectados: 'general'
      };
    }
  }
};

export default openaiService; 