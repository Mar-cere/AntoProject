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
import mongoose from 'mongoose';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RESPONSE_LENGTHS = {
  SHORT: 200,    // Mínimo para respuestas completas
  MEDIUM: 300,   // Para respuestas más elaboradas
  LONG: 400     // Para situaciones que requieren más detalle
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

const GREETING_VARIATIONS = {
  morning: [
    "¡Buenos días! ¿Cómo puedo ayudarte hoy?",
    "¡Hola! ¿Cómo amaneciste hoy?",
    "Buenos días, ¿cómo te sientes hoy?"
  ],
  afternoon: [
    "¡Hola! ¿Cómo va tu día?",
    "¡Buenas tardes! ¿En qué puedo ayudarte?",
    "¡Hola! ¿Cómo te sientes en este momento?"
  ],
  evening: [
    "¡Buenas tardes! ¿Cómo ha ido tu día?",
    "¡Hola! ¿Cómo te encuentras esta tarde?",
    "¡Hola! ¿Qué tal va todo?"
  ],
  night: [
    "¡Buenas noches! ¿Cómo te sientes?",
    "¡Hola! ¿Cómo ha ido tu día?",
    "¡Buenas noches! ¿En qué puedo ayudarte?"
  ]
};

const generateEnhancedResponse = async (message, context, strategy) => {
  try {
    // Detectar si es un saludo simple
    const isGreeting = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)$/i.test(message.content.trim());
    
    if (isGreeting) {
      const hour = new Date().getHours();
      const timeOfDay = 
        hour >= 5 && hour < 12 ? 'morning' :
        hour >= 12 && hour < 18 ? 'afternoon' :
        hour >= 18 && hour < 22 ? 'evening' : 'night';
      
      // Obtener variaciones para el momento del día
      const variations = GREETING_VARIATIONS[timeOfDay];
      // Seleccionar una variación aleatoria
      return variations[Math.floor(Math.random() * variations.length)];
    }

    const promptTemplate = {
      supportive: `Eres Anto, un asistente terapéutico profesional y empático.
      
      CONTEXTO ACTUAL:
      - Momento del día: ${getTimeOfDay()}
      - Estado emocional previo: ${context.emotionalTrend?.latest || 'neutral'}
      - Últimos temas tratados: ${context.topics?.join(', ') || 'ninguno'}
      
      DIRECTRICES DE RESPUESTA:
      1. NUNCA repitas exactamente la misma respuesta
      2. Adapta el tono según el contexto emocional
      3. Personaliza la respuesta según el momento del día
      4. Mantén continuidad con conversaciones previas
      5. Usa variedad en expresiones y estructura
      
      ESTRUCTURA REQUERIDA:
      1. Reconocimiento específico de la situación
      2. Elemento de apoyo o validación
      3. Pregunta exploratoria O sugerencia concreta
      
      EJEMPLOS DE VARIACIÓN:
      - "Veo que esto te está afectando profundamente. Es normal sentirse así y quiero que sepas que estoy aquí para escucharte. ¿Qué te ayudaría en este momento?"
      - "Entiendo tu frustración y es completamente válida. Me gustaría ayudarte a explorar esto con más profundidad. ¿Podrías contarme qué te llevó a sentirte así?"
      - "Gracias por compartir esto conmigo. Es importante expresar cómo nos sentimos y estoy aquí para escucharte. ¿Qué necesitas en este momento?"`,

      empathetic: `Eres Anto, profesional en apoyo emocional.
      
      CONTEXTO:
      - Hora del día: ${new Date().getHours()}
      - Emoción detectada: ${context.emotionalTrend?.latest || 'neutral'}
      
      REQUISITOS:
      1. Cada respuesta debe ser única
      2. Adaptar el lenguaje al estado emocional
      3. Incluir elementos de apoyo concretos
      4. Mantener un tono cálido pero profesional
      
      NO PERMITIDO:
      - Respuestas genéricas
      - Repetir exactamente frases anteriores
      - Ignorar el contexto emocional`,

      casual: `Eres Anto, asistente profesional.
      
      CONTEXTO:
      - Momento: ${getTimeOfDay()}
      - Interacción: ${context.lastInteraction ? 'seguimiento' : 'nueva'}
      
      ENFOQUE:
      1. Respuestas naturales y variadas
      2. Mantener profesionalismo
      3. Adaptar al contexto temporal
      4. Evitar repeticiones`
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
      temperature: 0.8, // Aumentado para más variabilidad
      max_tokens: RESPONSE_LENGTHS[strategy.responseLength] || RESPONSE_LENGTHS.SHORT,
      presence_penalty: 0.8, // Aumentado para evitar repeticiones
      frequency_penalty: 0.8 // Aumentado para favorecer variedad en el lenguaje
    });

    let response = completion.choices[0].message.content.trim();
    
    // Verificación de calidad de respuesta
    if (response.split(' ').length < 10 || 
        response === context.lastResponse || 
        isGenericResponse(response)) {
      return generateFallbackResponse(context);
    }

    return response;
  } catch (error) {
    console.error('Error en generateEnhancedResponse:', error);
    return generateFallbackResponse(context);
  }
};

// Función auxiliar para verificar si una respuesta es demasiado genérica
const isGenericResponse = (response) => {
  const genericPatterns = [
    /^(Entiendo|Comprendo) (como|cómo) te sientes/i,
    /^(Me gustaría|Quisiera) (saber|entender) más/i,
    /^¿Podrías contarme más\??$/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(response));
};

// Función para generar respuestas de respaldo variadas
const generateFallbackResponse = (context) => {
  const fallbackResponses = [
    "Me interesa mucho entender mejor tu situación. ¿Podrías compartir más detalles sobre lo que estás experimentando?",
    "Quisiera ayudarte de la mejor manera posible. ¿Qué te gustaría explorar en este momento?",
    "Estoy aquí para escucharte y apoyarte. ¿Qué necesitas en este momento?",
    "Tu bienestar es importante para mí. ¿Cómo podría ayudarte mejor ahora?",
    "Cada experiencia es única y válida. ¿Te gustaría contarme más sobre la tuya?"
  ];
  
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'mañana';
  if (hour >= 12 && hour < 18) return 'tarde';
  if (hour >= 18 && hour < 22) return 'noche';
  return 'noche tarde';
};

const updateTherapeuticRecord = async (userId, sessionData) => {
  try {
    const newSession = {
      timestamp: new Date(),
      emotion: {
        name: sessionData.emotion?.name || 'neutral',
        intensity: sessionData.emotion?.intensity || 5
      },
      tools: [],
      progress: 'en_curso'
    };

    // Solución: Usar $setOnInsert para valores iniciales
    const updateResult = await TherapeuticRecord.findOneAndUpdate(
      { userId },
      {
        $push: { sessions: newSession },
        $set: {
          'currentStatus.emotion': sessionData.emotion?.name || 'neutral',
          'currentStatus.lastUpdate': new Date()
        },
        $setOnInsert: {
          userId,
          activeTools: [],
          progressMetrics: {
            emotionalStability: 5,
            toolMastery: 1,
            engagementLevel: 5
          }
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    return updateResult;
  } catch (error) {
    console.error('Error en updateTherapeuticRecord:', error);
    return null;
  }
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    const emotionalAnalysis = await emotionalAnalyzer.analyzeEmotion(message);
    const userContext = await memoryService.getRelevantContext(userId, message.content) || DEFAULT_CONTEXT;
    
    // Determinar la longitud apropiada basada en el contenido
    const responseLength = message.content.length < 50 ? 'SHORT' : 'MEDIUM';

    const response = await generateEnhancedResponse(message, userContext, {
      approach: emotionalAnalysis?.emotion ? 'empathetic' : 'casual',
      responseLength
    });

    // Verificar que la respuesta sea válida
    if (!response || response.length < 10) {
      return {
        content: "¿Podrías contarme más sobre eso?",
        context: DEFAULT_CONTEXT
      };
    }

    const emotionalData = {
      name: emotionalAnalysis?.emotion || 'neutral',
      intensity: emotionalAnalysis?.intensity || 5
    };

    await updateTherapeuticRecord(userId, {
      emotion: emotionalData,
      tools: emotionalAnalysis?.responses?.tools || [],
      progress: 'en_curso'
    });

    return {
      content: response,
      context: {
        ...userContext,
        emotionalContext: {
          mainEmotion: emotionalData.name,
          intensity: emotionalData.intensity
        }
      }
    };

  } catch (error) {
    console.error('Error en generateAIResponse:', error);
    return {
      content: "¿Podrías contarme más sobre eso?",
      context: DEFAULT_CONTEXT
    };
  }
};

export default {
  generateAIResponse,
  updateTherapeuticRecord,
  analyzeMessageContext
}; 