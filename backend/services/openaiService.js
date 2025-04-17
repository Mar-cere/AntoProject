import OpenAI from 'openai';
import dotenv from 'dotenv';
import personalizationService from './personalizationService.js';
import TherapeuticRecord from '../models/TherapeuticRecord.js';
import memoryService from './memoryService.js';
import contextAnalyzer from './contextAnalyzer.js';
import goalTracker from './goalTracker.js';
import UserInsight from '../models/UserInsight.js';
import UserGoals from '../models/UserGoals.js';

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

const determineResponseLength = (emotionalAnalysis, conversationState) => {
  // Aumentamos los tokens base para asegurar respuestas completas
  const tokenLengths = {
    SHORT: 150,    // Mínimo para asegurar respuestas completas
    MEDIUM: 250,   // Respuestas estándar
    LONG: 400     // Respuestas elaboradas
  };

  // Si el mensaje es sobre temas importantes (carrera, decisiones vitales)
  if (conversationState.recurringThemes.includes('ocupacional') || 
      conversationState.recurringThemes.includes('educación')) {
    return tokenLengths.MEDIUM;
  }

  // Si requiere atención urgente o emocional
  if (emotionalAnalysis.requiresUrgentCare || 
      emotionalAnalysis.primaryEmotion) {
    return tokenLengths.MEDIUM;
  }

  return tokenLengths.SHORT;
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
    // Obtener contexto y análisis
    const userContext = await memoryService.getRelevantContext(userId, message.content);
    const messageIntent = await contextAnalyzer.analyzeMessageIntent(message, conversationHistory);
    const responseStrategy = contextAnalyzer.generateResponseStrategy(messageIntent.intent, userContext);

    // Generar respuesta mejorada
    const response = await generateEnhancedResponse(message, userContext, responseStrategy);

    // Actualizar registros y seguimiento
    await Promise.all([
      memoryService.updateUserInsights(userId, message, userContext),
      goalTracker.updateGoalProgress(userId, message, userContext),
      updateTherapeuticRecord(userId, {
        emotion: userContext?.emotionalTrend?.latest,
        tools: responseStrategy.includeTechniques ? ['emotional_support', 'coping_strategies'] : [],
        progress: messageIntent.intent
      })
    ]);

    return {
      content: response,
      context: userContext,
      intent: messageIntent,
      strategy: responseStrategy
    };

  } catch (error) {
    console.error('Error en generateAIResponse:', error);
    throw error;
  }
};

const updateTherapeuticRecord = async (userId, sessionData) => {
  try {
    const update = {
      $push: {
        sessions: {
          timestamp: new Date(),
          emotion: sessionData.emotion || 'neutral',
          toolsUsed: sessionData.tools || [],
          progress: sessionData.progress || 'en curso'
        }
      },
      $set: {
        lastInteraction: new Date(),
        currentStatus: sessionData.emotion || 'neutral',
        activeTools: sessionData.tools || []
      }
    };

    // Si hay métricas de progreso, actualizarlas
    if (sessionData.emotionalStability) {
      update.$set['progressMetrics.emotionalStability'] = sessionData.emotionalStability;
    }
    if (sessionData.toolMastery) {
      update.$set['progressMetrics.toolMastery'] = sessionData.toolMastery;
    }
    if (sessionData.engagementLevel) {
      update.$set['progressMetrics.engagementLevel'] = sessionData.engagementLevel;
    }

    const record = await TherapeuticRecord.findOneAndUpdate(
      { userId },
      update,
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );

    return record;
  } catch (error) {
    console.error('Error actualizando registro terapéutico:', error);
    // No lanzamos el error para no interrumpir la conversación
    return null;
  }
};

const generateEnhancedResponse = async (message, context, strategy) => {
  const promptTemplate = {
    supportive: `Eres Anto, un asistente empático y profesional.
    El usuario necesita ayuda con: ${message.content}
    Contexto emocional: ${context.emotionalTrend}
    Objetivos actuales: ${context.goals.join(', ')}
    
    Proporciona:
    1. Validación empática
    2. Una sugerencia práctica específica
    3. Una pregunta de seguimiento enfocada
    
    Mantén un tono cálido pero profesional.`,

    empathetic: `Eres Anto, centrándote en el apoyo emocional.
    Estado emocional actual: ${context.emotionalContext.mainEmotion}
    Historial relevante: ${context.patterns.join(', ')}
    
    Ofrece:
    1. Reconocimiento de la emoción
    2. Normalización de la experiencia
    3. Una técnica de regulación emocional específica`,

    encouraging: `Eres Anto, celebrando el progreso.
    Logro actual: ${message.content}
    Objetivos relacionados: ${context.goals.join(', ')}
    
    Proporciona:
    1. Reconocimiento específico del logro
    2. Conexión con objetivos mayores
    3. Sugerencia para el siguiente paso`
  };

  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: promptTemplate[strategy.approach]
      },
      {
        role: 'user',
        content: message.content
      }
    ],
    temperature: 0.7,
    max_tokens: strategy.responseLength === 'SHORT' ? 150 : 250,
    presence_penalty: 0.6
  });

  return completion.choices[0].message.content;
};

export default {
  analyzeMessageContext,
  generateAIResponse
}; 