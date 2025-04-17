import OpenAI from 'openai';
import dotenv from 'dotenv';
import personalizationService from './personalizationService.js';
import TherapeuticRecord from '../models/TherapeuticRecord.js';

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
  // Base tokens para diferentes tipos de respuestas
  const tokenLengths = {
    SHORT: 75,    // Respuestas breves
    MEDIUM: 150,  // Respuestas estándar
    LONG: 250     // Respuestas elaboradas
  };

  // Si requiere atención urgente, usar respuesta media
  if (emotionalAnalysis.requiresUrgentCare) {
    return tokenLengths.MEDIUM;
  }

  // Si está en fase inicial o necesita estabilización, usar respuestas más largas
  if (conversationState.phase === 'inicial' || conversationState.needsStabilization) {
    return tokenLengths.LONG;
  }

  // Si está aprendiendo herramientas o necesita reencuadre, usar respuesta media
  if (conversationState.phase === 'aprendizaje' || conversationState.needsReframing) {
    return tokenLengths.MEDIUM;
  }

  // Para seguimiento general, usar respuestas cortas
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

    const response = await completion.choices[0].message.content;

    // Intentar actualizar el registro terapéutico, pero no bloquear si falla
    try {
      await updateTherapeuticRecord(userId, {
        emotion: emotionalAnalysis.primaryEmotion,
        tools: emotionalAnalysis.suggestedTools,
        progress: conversationState.progress,
        emotionalStability: emotionalAnalysis.intensity ? (10 - emotionalAnalysis.intensity) : undefined,
        toolMastery: emotionalAnalysis.suggestedTools.length ? 5 : undefined,
        engagementLevel: conversationHistory.length > 5 ? 7 : 5
      });
    } catch (recordError) {
      console.error('Error en registro terapéutico:', recordError);
      // Continuamos con la respuesta aunque falle el registro
    }

    return {
      content: response,
      analysis: emotionalAnalysis,
      state: conversationState
    };

  } catch (error) {
    console.error('Error generando respuesta:', error);
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

export default {
  analyzeMessageContext,
  generateAIResponse
}; 