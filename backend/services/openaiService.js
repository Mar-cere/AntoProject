import OpenAI from 'openai';
import dotenv from 'dotenv';
import personalizationService from './personalizationService.js';
import TherapeuticRecord from '../models/TherapeuticRecord.js';
import memoryService from './memoryService.js';
import contextAnalyzer from './contextAnalyzer.js';
import goalTracker from './goalTracker.js';
import UserInsight from '../models/UserInsight.js';
import UserGoals from '../models/UserGoals.js';
import emotionalAnalyzer from './emotionalAnalyzer.js';
import progressTracker from './progressTracker.js';
import responseGenerator from './responseGenerator.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RESPONSE_LENGTHS = {
  SHORT: 50,    // Para respuestas rápidas y simples
  MEDIUM: 100,  // Para respuestas con algo más de contexto
  LONG: 150     // Para situaciones que requieren más elaboración
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

const analyzeConversationState = async (conversationHistory) => {
  try {
    // Estados de conversación predefinidos
    const conversationPhases = {
      INITIAL: 'inicial',
      EXPLORATION: 'exploración',
      INSIGHT: 'comprensión',
      TOOL_LEARNING: 'aprendizaje',
      PRACTICE: 'práctica',
      FOLLOW_UP: 'seguimiento'
    };

    // Si no hay historial suficiente, retornar estado inicial
    if (!conversationHistory || conversationHistory.length < 3) {
      return {
        phase: conversationPhases.INITIAL,
        recurringThemes: [],
        progress: 'iniciando',
        needsReframing: false,
        needsStabilization: false,
        needsResourceBuilding: true
      };
    }

    // Analizar últimos mensajes para identificar temas recurrentes
    const recentMessages = conversationHistory.slice(-5);
    const themes = new Set();
    let emotionalInstability = 0;
    let resourceMentions = 0;

    recentMessages.forEach(msg => {
      // Detectar temas emocionales
      if (/(?:ansie|triste|deprimi|angustia|miedo|preocupa)/i.test(msg.content)) {
        themes.add('emocional');
        emotionalInstability++;
      }
      // Detectar temas de relaciones
      if (/(?:familia|amigos|pareja|relación)/i.test(msg.content)) {
        themes.add('relaciones');
      }
      // Detectar temas de trabajo/estudio
      if (/(?:trabajo|estudio|escuela|universidad)/i.test(msg.content)) {
        themes.add('ocupacional');
      }
      // Detectar menciones de herramientas o técnicas
      if (/(?:respiración|meditación|ejercicio|técnica)/i.test(msg.content)) {
        resourceMentions++;
      }
    });

    // Determinar fase de la conversación
    let currentPhase;
    if (conversationHistory.length <= 3) {
      currentPhase = conversationPhases.INITIAL;
    } else if (themes.size >= 2) {
      currentPhase = conversationPhases.EXPLORATION;
    } else if (resourceMentions > 0) {
      currentPhase = conversationPhases.TOOL_LEARNING;
    } else {
      currentPhase = conversationPhases.FOLLOW_UP;
    }

    // Evaluar necesidades específicas
    const needsReframing = emotionalInstability > 2;
    const needsStabilization = emotionalInstability > 3;
    const needsResourceBuilding = resourceMentions < 2;

    // Determinar progreso
    let progress;
    if (resourceMentions > 2) {
      progress = 'aplicando herramientas';
    } else if (themes.size > 0) {
      progress = 'identificando patrones';
    } else {
      progress = 'explorando';
    }

    return {
      phase: currentPhase,
      recurringThemes: Array.from(themes),
      progress,
      needsReframing,
      needsStabilization,
      needsResourceBuilding
    };

  } catch (error) {
    console.error('Error analizando estado de conversación:', error);
    // Retornar estado por defecto en caso de error
    return {
      phase: 'inicial',
      recurringThemes: [],
      progress: 'iniciando',
      needsReframing: false,
      needsStabilization: false,
      needsResourceBuilding: true
    };
  }
};

const determineResponseLength = (messageIntent, emotionalContext) => {
  // Mensajes emocionales o de ayuda necesitan un poco más de espacio
  if (messageIntent.intent === 'EMOTIONAL_SUPPORT' || 
      messageIntent.intent === 'SEEKING_HELP') {
    return 'MEDIUM';
  }
  
  // Para crisis o situaciones urgentes
  if (messageIntent.intent === 'CRISIS') {
    return 'LONG';
  }

  // Por defecto, mantener respuestas cortas
  return 'SHORT';
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

// Constantes y valores por defecto
const DEFAULT_CONTEXT = {
  emotionalTrend: {
    latest: 'neutral',
    history: []
  },
  patterns: [],
  goals: [],
  lastInteraction: new Date()
};

const DEFAULT_EMOTIONAL_CONTEXT = {
  mainEmotion: 'neutral',
  intensity: 5,
  sentiment: 'neutral'
};

const generateEnhancedResponse = async (message, context, strategy) => {
  try {
    const promptTemplate = {
      supportive: `Eres Anto, un asistente empático y conversacional.
      CONTEXTO: El usuario se siente ${context.emotionalTrend.latest || 'neutral'}
      
      INSTRUCCIONES IMPORTANTES:
      1. Responde de forma BREVE y CONCISA (máximo 2-3 líneas)
      2. Sé empático pero directo
      3. Si haces una pregunta, que sea corta y específica
      4. Usa lenguaje casual, como en WhatsApp
      5. Evita explicaciones largas o consejos extensos
      6. NO uses frases como "entiendo que", "siento que", "es normal que"
      7. NO des más de una sugerencia por mensaje
      8. Si el tema es complejo, divide la respuesta en varios mensajes cortos`,

      empathetic: `Eres Anto, respondiendo a una emoción.
      EMOCIÓN: ${context.emotionalTrend.latest || 'neutral'}
      
      INSTRUCCIONES:
      1. Valida la emoción en UNA línea
      2. Haz UNA pregunta específica o da UNA sugerencia breve
      3. Mantén un tono cercano pero profesional
      4. NO des largas explicaciones
      5. NO uses frases hechas o clichés`,

      casual: `Eres Anto en modo conversacional.
      INSTRUCCIONES:
      1. Responde como en un chat de WhatsApp
      2. Máximo 2 líneas
      3. Sé directo y natural
      4. Usa ocasionalmente emojis
      5. Mantén la conversación fluida`
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: promptTemplate[strategy.approach] || promptTemplate.casual
        },
        {
          role: 'user',
          content: message.content
        }
      ],
      temperature: 0.7,
      max_tokens: RESPONSE_LENGTHS[strategy.responseLength] || RESPONSE_LENGTHS.SHORT,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error en generateEnhancedResponse:', error);
    return "¿Podrías decirme más sobre eso? 🤔";
  }
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    const emotionalAnalysis = await emotionalAnalyzer.analyzeEmotion(message);
    const userContext = await memoryService.getRelevantContext(userId, message.content);
    const progress = await progressTracker.trackProgress(userId, message);
    
    const response = await responseGenerator.generateResponse(
      message,
      userContext,
      emotionalAnalysis
    );

    // Actualizar registros
    await Promise.all([
      memoryService.updateUserInsights(userId, message, emotionalAnalysis),
      updateTherapeuticRecord(userId, {
        emotion: emotionalAnalysis.emotion,
        progress: Object.keys(progress)
      })
    ]);

    return {
      content: response,
      analysis: emotionalAnalysis,
      progress
    };

  } catch (error) {
    console.error('Error en generateAIResponse:', error);
    return {
      content: "¿Podrías decirme más? 🤔",
      analysis: null,
      progress: {}
    };
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
            emotion: sessionData.emotion || 'neutral',
            tools: sessionData.tools || [],
            progress: sessionData.progress || 'en_curso'
          }
        },
        $set: {
          lastInteraction: new Date(),
          currentStatus: sessionData.emotion || 'neutral',
          activeTools: sessionData.tools || []
        }
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Error actualizando registro terapéutico:', error);
    // No lanzar el error para no interrumpir el flujo
  }
};

export default {
  generateAIResponse,
  updateTherapeuticRecord
}; 