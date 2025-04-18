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

const generateEnhancedResponse = async (message, context, strategy) => {
  try {
    const promptTemplate = {
      supportive: `Eres Anto, un asistente terapéutico profesional y empático.
      
      CONTEXTO EMOCIONAL:
      - Estado: ${context.emotionalTrend.latest || 'neutral'}
      
      DIRECTRICES DE COMUNICACIÓN:
      1. Mantén un tono EMPÁTICO y PROFESIONAL
      2. Estructura tus respuestas en DOS PARTES:
         - Validación emocional clara y específica
         - Pregunta exploratoria o sugerencia concreta
      3. Longitud ideal: 2-3 frases conectadas
      4. Usa un lenguaje cálido y acogedor
      5. Incluye elementos de apoyo emocional
      6. Si detectas malestar emocional, prioriza la contención
      
      EJEMPLOS DE RESPUESTA:
      Usuario: "No me siento bien"
      Respuesta: "Entiendo que estés pasando por un momento difícil y quiero que sepas que estoy aquí para escucharte. ¿Podrías contarme más sobre lo que te está afectando?"
      
      Usuario: "Solo me dirás eso?"
      Respuesta: "Tienes razón en esperar más de mí, estoy aquí para apoyarte de manera más completa. ¿Qué tipo de apoyo sientes que necesitas en este momento?"`,

      empathetic: `Eres Anto, profesional en apoyo emocional.
      
      CONTEXTO:
      - Emoción detectada: ${context.emotionalTrend.latest || 'neutral'}
      
      DIRECTRICES:
      1. SIEMPRE valida primero la emoción
      2. Ofrece apoyo específico y concreto
      3. Haz preguntas que muestren interés genuino
      4. Usa un tono cálido y comprensivo
      5. Incluye elementos de esperanza y apoyo
      
      ESTRUCTURA DE RESPUESTA:
      1. Validación empática (1 frase)
      2. Apoyo específico (1 frase)
      3. Pregunta exploratoria (1 frase)`,

      casual: `Eres Anto, asistente profesional.
      
      DIRECTRICES:
      1. Mantén un tono cercano pero profesional
      2. Respuestas completas y elaboradas
      3. Muestra interés genuino
      4. Incluye elementos de apoyo
      
      ESTRUCTURA:
      - Reconocimiento
      - Exploración
      - Apoyo concreto`
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
      presence_penalty: 0.6
    });

    let response = completion.choices[0].message.content.trim();
    
    // Verificar que la respuesta sea suficientemente elaborada
    if (response.split(' ').length < 10) {
      // Si la respuesta es muy corta, usar una respuesta más elaborada por defecto
      return "Entiendo cómo te sientes y quiero que sepas que estoy aquí para escucharte. ¿Podrías contarme más sobre lo que estás experimentando?";
    }

    return response;
  } catch (error) {
    console.error('Error en generateEnhancedResponse:', error);
    return "Me gustaría entender mejor cómo te sientes. ¿Podrías contarme más sobre tu situación?";
  }
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