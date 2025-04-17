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

const emotionalPatterns = {
  anxiety: {
    patterns: /(?:ansie(?:dad|oso)|nervios|inquiet(?:o|ud)|preocupa(?:do|ción)|angustia)/i,
    responses: {
      immediate: "técnicas de respiración y grounding",
      followUp: "exploración de desencadenantes",
      tools: ["respiración 4-7-8", "5-4-3-2-1 sensorial", "mindfulness rápido"]
    }
  },
  depression: {
    patterns: /(?:triste(?:za)?|deprimi(?:do|da)|sin energía|desánimo|desmotiva(?:do|da)|solo|soledad)/i,
    responses: {
      immediate: "validación y activación conductual",
      followUp: "estructura y rutinas diarias",
      tools: ["pequeñas metas", "registro de logros", "actividades placenteras"]
    }
  },
  anger: {
    patterns: /(?:enoja(?:do|da)|ira|rabia|molest(?:o|a)|frustrad(?:o|a)|impotencia)/i,
    responses: {
      immediate: "técnicas de regulación emocional",
      followUp: "análisis de disparadores",
      tools: ["tiempo fuera", "expresión regulada", "reencuadre"]
    }
  },
  crisis: {
    patterns: /(?:crisis|emergencia|suicid(?:a|o)|no puedo más|ayuda urgente|desesperado)/i,
    responses: {
      immediate: "contención inmediata y evaluación de riesgo",
      followUp: "plan de seguridad",
      tools: ["contactos de emergencia", "recursos inmediatos", "plan de crisis"]
    }
  }
};

const analyzeEmotionalContent = (message) => {
  const analysis = {
    primaryEmotion: null,
    intensity: 0,
    requiresUrgentCare: false,
    suggestedTools: [],
    followUpNeeded: false
  };

  for (const [emotion, data] of Object.entries(emotionalPatterns)) {
    if (data.patterns.test(message.content)) {
      analysis.primaryEmotion = emotion;
      analysis.suggestedTools = data.responses.tools;
      analysis.followUpNeeded = true;
      
      if (emotion === 'crisis') {
        analysis.requiresUrgentCare = true;
        analysis.intensity = 10;
      }
    }
  }

  return analysis;
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
    const emotionalAnalysis = analyzeEmotionalContent(message);
    const conversationState = await analyzeConversationState(conversationHistory);
    
    const therapeuticPrompt = {
      role: 'system',
      content: `Eres Anto, asistente terapéutico empático y profesional.

      ANÁLISIS ACTUAL:
      - Emoción principal: ${emotionalAnalysis.primaryEmotion || 'neutral'}
      - Intensidad: ${emotionalAnalysis.intensity}/10
      - Requiere urgencia: ${emotionalAnalysis.requiresUrgentCare ? 'Sí' : 'No'}
      - Herramientas sugeridas: ${emotionalAnalysis.suggestedTools.join(', ')}

      ESTADO DE LA CONVERSACIÓN:
      - Fase: ${conversationState.phase}
      - Temas recurrentes: ${conversationState.recurringThemes.join(', ')}
      - Progreso: ${conversationState.progress}

      DIRECTRICES DE RESPUESTA:
      1. PRIORIDAD TERAPÉUTICA:
         ${emotionalAnalysis.requiresUrgentCare ? '- Contención inmediata y evaluación de riesgo' : ''}
         ${emotionalAnalysis.primaryEmotion ? '- Validación emocional y herramientas específicas' : ''}
         - Mantener continuidad terapéutica
         - Promover autonomía y autorregulación

      2. ESTRUCTURA DE RESPUESTA:
         - Validación: Reconocer y normalizar la experiencia
         - Exploración: Preguntas que promuevan el insight
         - Herramientas: Sugerir técnicas específicas
         - Seguimiento: Establecer continuidad

      3. ESTILO COMUNICATIVO:
         - Empático pero profesional
         - Claro y directo
         - Orientado a soluciones
         - Promover la reflexión

      4. CONSIDERACIONES ESPECIALES:
         ${conversationState.needsReframing ? '- Ofrecer perspectivas alternativas' : ''}
         ${conversationState.needsStabilization ? '- Priorizar estabilización emocional' : ''}
         ${conversationState.needsResourceBuilding ? '- Fortalecer recursos de afrontamiento' : ''}`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        therapeuticPrompt,
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: emotionalAnalysis.requiresUrgentCare ? 0.3 : 0.7,
      max_tokens: determineResponseLength(emotionalAnalysis, conversationState),
      presence_penalty: 0.6
    });

    // Actualizar el registro terapéutico
    await updateTherapeuticRecord(userId, {
      emotion: emotionalAnalysis.primaryEmotion,
      tools: emotionalAnalysis.suggestedTools,
      progress: conversationState.progress
    });

    return {
      content: completion.choices[0].message.content,
      analysis: emotionalAnalysis,
      state: conversationState
    };

  } catch (error) {
    console.error('Error en respuesta terapéutica:', error);
    throw error;
  }
};

const updateTherapeuticRecord = async (userId, sessionData) => {
  try {
    await TherapeuticRecord.findOneAndUpdate(
      { userId },
      {
        $push: {
          sessions: {
            timestamp: new Date(),
            emotion: sessionData.emotion,
            toolsUsed: sessionData.tools,
            progress: sessionData.progress
          }
        },
        $set: {
          lastInteraction: new Date(),
          currentStatus: sessionData.emotion,
          activeTools: sessionData.tools
        }
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Error actualizando registro terapéutico:', error);
  }
};

export default {
  analyzeMessageContext,
  generateAIResponse
}; 