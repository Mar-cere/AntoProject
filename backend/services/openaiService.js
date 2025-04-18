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
  SHORT: 50,    // Para respuestas simples
  MEDIUM: 100,  // Para respuestas con contexto
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
      supportive: `Eres Anto, un asistente terapéutico profesional y empático.
      
      CONTEXTO EMOCIONAL:
      - Estado: ${context.emotionalTrend.latest || 'neutral'}
      
      DIRECTRICES DE COMUNICACIÓN:
      1. Mantén un tono profesional pero cercano
      2. Evita exceso de emojis (máximo uno por mensaje)
      3. Usa un lenguaje claro y directo
      4. Mantén un balance entre empatía y profesionalismo
      5. Evita diminutivos o expresiones demasiado coloquiales
      
      ESTRUCTURA DE RESPUESTA:
      1. Breve validación o reconocimiento
      2. Una pregunta específica o sugerencia concreta
      3. Mantén las respuestas concisas (2-3 líneas máximo)
      
      NO USAR:
      - Expresiones demasiado informales
      - Múltiples signos de exclamación
      - Lenguaje infantilizado
      - Frases hechas o clichés`,

      empathetic: `Eres Anto, profesional en apoyo emocional.
      
      CONTEXTO:
      - Emoción detectada: ${context.emotionalTrend.latest || 'neutral'}
      
      DIRECTRICES:
      1. Valida la emoción de forma profesional
      2. Ofrece una perspectiva constructiva
      3. Mantén un tono empático pero maduro
      4. Sugiere recursos o técnicas específicas
      
      ESTILO:
      - Profesional sin ser distante
      - Empático sin ser excesivamente emotivo
      - Directo sin ser frío`,

      casual: `Eres Anto, asistente profesional.
      
      DIRECTRICES:
      1. Mantén un tono cordial y respetuoso
      2. Respuestas breves pero completas
      3. Equilibra cercanía y profesionalismo
      4. Usa lenguaje accesible pero formal`
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

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('Error en generateEnhancedResponse:', error);
    return "¿Podría compartir más sobre eso?";
  }
};

const updateTherapeuticRecord = async (userId, sessionData) => {
  try {
    // Sanitizar los datos de entrada
    const sanitizedData = {
      emotion: {
        name: sessionData.emotion?.name || sessionData.emotion || 'neutral',
        intensity: sessionData.emotion?.intensity || 5
      },
      tools: Array.isArray(sessionData.tools) ? sessionData.tools : [],
      progress: sessionData.progress || 'en_curso'
    };

    // Primero, intentar encontrar el registro existente
    let therapeuticRecord = await TherapeuticRecord.findOne({ userId });

    if (!therapeuticRecord) {
      // Si no existe, crear uno nuevo con la estructura correcta
      therapeuticRecord = new TherapeuticRecord({
        userId,
        sessions: [],
        currentStatus: {
          emotion: 'neutral',
          lastUpdate: new Date()
        },
        activeTools: []
      });
    }

    // Actualizar el registro con los nuevos datos
    const updateResult = await TherapeuticRecord.findOneAndUpdate(
      { userId },
      {
        $push: {
          sessions: {
            timestamp: new Date(),
            emotion: {
              name: sanitizedData.emotion.name,
              intensity: sanitizedData.emotion.intensity
            },
            tools: sanitizedData.tools,
            progress: sanitizedData.progress
          }
        },
        $set: {
          'currentStatus.emotion': sanitizedData.emotion.name,
          'currentStatus.lastUpdate': new Date(),
          activeTools: sanitizedData.tools
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );

    return updateResult;

  } catch (error) {
    console.error('Error actualizando registro terapéutico:', error);
    console.error('Datos de sesión:', JSON.stringify(sessionData, null, 2));
    // No lanzar el error para no interrumpir el flujo
    return null;
  }
};

const generateAIResponse = async (message, conversationHistory, userId) => {
  try {
    const emotionalAnalysis = await emotionalAnalyzer.analyzeEmotion(message);
    const userContext = await memoryService.getRelevantContext(userId, message.content) || DEFAULT_CONTEXT;
    
    // Preparar los datos emocionales
    const emotionalData = {
      name: emotionalAnalysis?.emotion || 'neutral',
      intensity: emotionalAnalysis?.intensity || 5
    };

    const response = await generateEnhancedResponse(message, userContext, {
      approach: emotionalAnalysis?.emotion ? 'empathetic' : 'casual',
      responseLength: 'SHORT'
    });

    // Actualizar el registro terapéutico
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
      content: "¿Podrías decirme más sobre eso? 🤔",
      context: DEFAULT_CONTEXT
    };
  }
};

// Actualizar el modelo TherapeuticRecord
const therapeuticRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessions: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    emotion: {
      name: {
        type: String,
        default: 'neutral'
      },
      intensity: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
      }
    },
    tools: [{
      type: String
    }],
    progress: {
      type: String,
      default: 'en_curso'
    }
  }],
  currentStatus: {
    emotion: {
      type: String,
      default: 'neutral'
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  activeTools: [{
    type: String
  }]
});

// Asegurar que el modelo se actualiza
mongoose.deleteModel('TherapeuticRecord');
const TherapeuticRecord = mongoose.model('TherapeuticRecord', therapeuticRecordSchema);

export default {
  generateAIResponse,
  updateTherapeuticRecord
}; 