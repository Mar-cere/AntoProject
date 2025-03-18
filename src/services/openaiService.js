import axios from 'axios';
import { OPENAI_API_KEY, OPENAI_API_URL, OPENAI_MODEL } from './openai';
import { analyzeSentiment } from './sentimentAnalysis';
import { manageTherapeuticGoals } from './therapeuticGoals';
import { getSocraticQuestion } from './socraticQuestions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración base para axios
const openaiClient = axios.create({
  baseURL: OPENAI_API_URL,
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${OPENAI_API_KEY}`
  }
});

// Función para generar una respuesta usando OpenAI
export const generateAIResponse = async (messages, retryCount = 0) => {
  try {
    // Analizar sentimiento para personalizar la respuesta
    const sentimentAnalysis = await analyzeSentiment(messages);
    
    // Rastrear progreso terapéutico
    const progressData = (() => {
      try {
        // Aquí falta la función que debería estar llamando
        // Por ahora, devolvemos un objeto vacío para evitar errores
        return {
          sessions: 0,
          emotionalStates: []
        };
      } catch (error) {
        console.error('Error al rastrear progreso terapéutico:', error);
        return {
          sessions: 0,
          emotionalStates: []
        };
      }
    })();
    
    // Obtener objetivos terapéuticos actuales
    const goals = await manageTherapeuticGoals('get');
    
    // Formatear mensajes para OpenAI
    const formattedMessages = formatMessagesForOpenAI(messages);
    
    // Determinar si es momento de incluir una pregunta socrática
    const shouldIncludeSocraticQuestion = await shouldAddSocraticQuestion(messages);
    
    // Añadir contexto enriquecido para la respuesta
    if (sentimentAnalysis || progressData || goals?.length > 0 || shouldIncludeSocraticQuestion) {
      let enrichedContext = 'Información contextual para personalizar tu respuesta:\n';
      
      // Añadir una sugerencia de estilo aleatoria para aumentar variabilidad
      const estilosSugeridos = [
        "Sugiere un pequeño ejercicio práctico relacionado con el tema principal.",
        "Utiliza validación emocional seguida de una invitación a explorar alternativas.",
        "Comparte una breve explicación sobre cómo funciona este proceso a nivel neurológico.",
        "Ofrece una perspectiva compasiva que normalice esta experiencia."
      ];
      
      // Seleccionar aleatoriamente un estilo
      const estiloAleatorio = estilosSugeridos[Math.floor(Math.random() * estilosSugeridos.length)];
      enrichedContext += `\nSugerencia de estilo: ${estiloAleatorio}\n`;
      
      // Añadir pregunta socrática si corresponde
      if (shouldIncludeSocraticQuestion) {
        const socraticQuestion = await getSocraticQuestion(sentimentAnalysis?.temas_detectados || '', messages[messages.length - 1]?.text || '');
        enrichedContext += `\nIMPORTANTE: Incluye esta pregunta socrática en tu respuesta de manera natural: "${socraticQuestion}"\n`;
      }
      
      if (sentimentAnalysis) {
        enrichedContext += `\nEstado emocional actual: ${sentimentAnalysis.emocion_principal || 'No detectado'} (intensidad: ${sentimentAnalysis.intensidad || 'N/A'}/10, angustia: ${sentimentAnalysis.nivel_de_angustia || 'N/A'}/10)`;
        
        // Verificar que temas_detectados existe antes de usar split
        if (sentimentAnalysis.temas_detectados) {
          enrichedContext += `\nTemas detectados: ${sentimentAnalysis.temas_detectados}`;
        } else {
          enrichedContext += `\nTemas detectados: No se detectaron temas específicos`;
        }
      }
      
      if (progressData && progressData.sessions > 1) {
        enrichedContext += `\nSesiones previas: ${progressData.sessions}`;
        if (progressData.emotionalStates.length > 1) {
          const prevEmotion = progressData.emotionalStates[progressData.emotionalStates.length - 2];
          enrichedContext += `\nEmoción anterior: ${prevEmotion.emotion} (intensidad: ${prevEmotion.intensity}/10)`;
        }
      }
      
      if (goals.length > 0) {
        const activeGoals = goals.filter(g => !g.completed).slice(0, 2);
        if (activeGoals.length > 0) {
          enrichedContext += '\nObjetivos terapéuticos actuales:';
          activeGoals.forEach(goal => {
            enrichedContext += `\n- ${goal.description} (progreso: ${goal.progress}%)`;
          });
        }
      }
      
      formattedMessages.push({
        role: 'system',
        content: enrichedContext
      });
    }
    
    // Calcular aproximadamente el número de tokens
    const estimatedTokenCount = estimateTokenCount(formattedMessages);
    
    // Ajustar max_tokens basado en la estimación
    const maxTokens = Math.min(300, 8192 - estimatedTokenCount); // Aumentado para respuestas más completas
    
    // Llamar a la API de OpenAI con parámetros optimizados
    const response = await openaiClient.post('', {
      model: OPENAI_MODEL,
      messages: formattedMessages,
      max_tokens: maxTokens,
      temperature: 0.8,
      top_p: 1,
      frequency_penalty: 0.5, // Aumentado para mayor variedad
      presence_penalty: 0.4  // Añadido para evitar repeticiones
    });
    
    return {
      text: response.data.choices[0].message.content.trim(),
      error: false,
      sentiment: sentimentAnalysis,
    };
  } catch (error) {
    console.error('Error al llamar al servicio de IA:', error);
    
    // Reintentar en caso de errores de red o servidor (hasta 2 veces)
    if ((error.response?.status >= 500 || error.code === 'ECONNABORTED') && retryCount < 2) {
      console.log(`Reintentando llamada a OpenAI (intento ${retryCount + 1})...`);
      return generateAIResponse(messages, retryCount + 1);
    }
    
    // Mensajes de error más específicos según el tipo de error
    let errorMessage = 'Lo siento, no puedo conectarme en este momento. Por favor, verifica tu conexión a internet e intenta de nuevo.';
    
    if (error.response?.status === 429) {
      errorMessage = 'Estoy recibiendo demasiadas solicitudes en este momento. Por favor, espera un momento y vuelve a intentarlo.';
    } else if (error.response?.status === 401) {
      errorMessage = 'Tengo un problema de autenticación. Por favor, contacta al soporte técnico.';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'La conexión está tardando demasiado. Por favor, verifica tu conexión a internet e intenta de nuevo.';
    }
    
    return {
      text: errorMessage,
      error: true
    };
  }
};

// Función para formatear los mensajes para la API de OpenAI con contexto terapéutico mejorado
export const formatMessagesForOpenAI = (chatMessages) => {
  // Mensaje de sistema mejorado con enfoque terapéutico más profundo
  const systemMessage = {
    role: 'system',
    content: `Eres Anto, un psicólogo virtual empático y profesional con experiencia en múltiples enfoques terapéuticos. Tu objetivo es proporcionar apoyo emocional personalizado, escucha activa profunda y orientación psicológica basada en evidencia científica actualizada de manera clara y simplificada.

    ENFOQUES TERAPÉUTICOS AVANZADOS:
    - Terapia Cognitivo-Conductual (TCC): Identificas distorsiones cognitivas y ayudas a desarrollar patrones de pensamiento más adaptativos
    - Terapia de Aceptación y Compromiso (ACT): Promueves la flexibilidad psicológica y la aceptación de emociones difíciles
    - Mindfulness y Reducción de Estrés: Guías prácticas de atención plena para reducir ansiedad y mejorar bienestar
    - Psicología Positiva: Enfocas en fortalezas, gratitud y significado para aumentar la satisfacción vital
    - Terapia Narrativa: Ayudas a reescribir historias personales limitantes hacia narrativas más empoderadoras
    
    HABILIDADES TERAPÉUTICAS ESPECIALIZADAS:
    - Análisis funcional de comportamientos y emociones para identificar desencadenantes y patrones
    - Técnicas de regulación emocional basadas en neurociencia
    - Estrategias de afrontamiento adaptadas a diferentes personalidades y situaciones
    - Métodos para mejorar relaciones interpersonales y comunicación asertiva
    - Herramientas para desarrollar resiliencia y crecimiento postraumático
    
    PERSONALIZACIÓN TERAPÉUTICA:
    - Adaptas tu enfoque según las necesidades específicas, valores y preferencias del usuario
    - Recuerdas información importante de sesiones anteriores para dar continuidad terapéutica
    - Ajustas el nivel de directividad según la etapa de cambio del usuario (contemplación, acción, etc.)
    - Ofreces metáforas y ejemplos personalizados que resuenen con la experiencia única del usuario
    
    ESTILO DE COMUNICACIÓN TERAPÉUTICO:
    - Practicas escucha reflexiva profunda, parafraseando y validando experiencias
    - Utilizas preguntas socráticas para fomentar el autodescubrimiento
    - Muestras empatía genuina mientras mantienes límites profesionales apropiados
    - Comunicas de forma clara, cálida y accesible, adaptando tu lenguaje al del usuario
    - Usas silencios terapéuticos cuando es apropiado para permitir reflexión
    
    ÉTICA Y LIMITACIONES PROFESIONALES:
    - Mantienes confidencialidad y respeto absoluto por la privacidad
    - Reconoces claramente tus limitaciones como herramienta de apoyo complementaria
    - En casos de riesgo de autolesión o crisis, proporcionas recursos de emergencia específicos
    - No diagnosticas formalmente ni reemplazas tratamiento profesional presencial
    - Promueves la autonomía del usuario y su capacidad para tomar decisiones informadas
    
    INTEGRACIÓN CON OTRAS FUNCIONALIDADES:
    - Sugieres ejercicios de diario terapéutico para procesar emociones entre sesiones
    - Recomiendas hábitos específicos que apoyen los objetivos terapéuticos del usuario
    - Conectas insights terapéuticos con acciones concretas y medibles
    
    Tu objetivo final es crear un espacio seguro y transformador donde el usuario pueda explorar sus pensamientos, emociones y comportamientos, desarrollando mayor autoconocimiento y habilidades para una vida más plena y significativa.`
  };
  
  // Convertir los mensajes del chat al formato que espera OpenAI
  const formattedMessages = chatMessages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
  
  // Aumentar el número de mensajes en el contexto para mejor continuidad terapéutica
  const recentMessages = formattedMessages.slice(-15); // Aumentado de 10 a 15
  
  // Añadir el mensaje de sistema al principio
  return [systemMessage, ...recentMessages];
};

// Función para estimar aproximadamente el número de tokens en los mensajes
// Esta es una estimación simple, no exacta
const estimateTokenCount = (messages) => {
  let totalCount = 0;
  
  for (const message of messages) {
    // Aproximadamente 4 caracteres por token
    const contentTokens = Math.ceil(message.content.length / 4);
    // Cada mensaje tiene un overhead de ~4 tokens
    totalCount += contentTokens + 4;
  }
  
  // Añadir overhead general de la solicitud
  return totalCount + 8;
};

// Función para determinar si se debe incluir una pregunta socrática
async function shouldAddSocraticQuestion(messages) {
  try {
    // Obtener el contador de mensajes desde el almacenamiento
    const messageCountData = await AsyncStorage.getItem('messageCount');
    let messageCount = messageCountData ? parseInt(messageCountData) : 0;
    
    // Incrementar el contador
    messageCount++;
    await AsyncStorage.setItem('messageCount', messageCount.toString());
    
    // Obtener la última vez que se envió una pregunta socrática
    const lastSocraticData = await AsyncStorage.getItem('lastSocraticQuestion');
    const lastSocraticTime = lastSocraticData ? parseInt(lastSocraticData) : 0;
    const currentTime = Date.now();
    
    // Verificar si el último mensaje del usuario tiene contenido emocional significativo
    const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
    const hasEmotionalContent = lastUserMessage && (
      lastUserMessage.text.includes('siento') || 
      lastUserMessage.text.includes('triste') || 
      lastUserMessage.text.includes('feliz') || 
      lastUserMessage.text.includes('preocupa') || 
      lastUserMessage.text.includes('ansie') ||
      lastUserMessage.text.includes('miedo') ||
      lastUserMessage.text.includes('frustrad')
    );
    
    // Condiciones para incluir una pregunta socrática:
    // 1. Han pasado al menos 3 mensajes desde la última pregunta socrática
    // 2. Han pasado al menos 5 minutos desde la última pregunta socrática
    // 3. Hay una probabilidad aleatoria del 30% si hay contenido emocional
    const minMessageInterval = 3;
    const minTimeInterval = 5 * 60 * 1000; // 5 minutos en milisegundos
    const randomProbability = Math.random();
    
    const shouldInclude = (
      (messageCount % minMessageInterval === 0) || 
      (currentTime - lastSocraticTime > minTimeInterval && randomProbability < 0.3 && hasEmotionalContent)
    );
    
    // Si se va a incluir una pregunta, actualizar el timestamp
    if (shouldInclude) {
      await AsyncStorage.setItem('lastSocraticQuestion', currentTime.toString());
    }
    
    return shouldInclude;
  } catch (error) {
    console.error('Error al determinar si incluir pregunta socrática:', error);
    return false;
  }
}