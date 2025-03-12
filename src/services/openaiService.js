import { OPENAI_API_KEY, OPENAI_API_URL, OPENAI_MODEL } from '../services/openai.js';

// Función para generar una respuesta usando la API de OpenAI
export const generateAIResponse = async (messages) => {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('Error de OpenAI:', data.error);
      return {
        text: 'Lo siento, estoy teniendo problemas para procesar tu solicitud. Por favor, intenta de nuevo más tarde.',
        error: true
      };
    }
    
    return {
      text: data.choices[0].message.content.trim(),
      error: false
    };
  } catch (error) {
    console.error('Error al llamar a la API de OpenAI:', error);
    return {
      text: 'Lo siento, no puedo conectarme en este momento. Por favor, verifica tu conexión a internet e intenta de nuevo.',
      error: true
    };
  }
};

// Función para formatear los mensajes para la API de OpenAI
export const formatMessagesForOpenAI = (chatMessages) => {
  // Mensaje de sistema para establecer el contexto y personalidad
  const systemMessage = {
    role: 'system',
    content: `Eres Anto, un asistente personal amigable y útil. Tu objetivo es ayudar al usuario con sus tareas, hábitos y organización personal.
    Eres conversacional, empático y ofreces respuestas concisas pero útiles.
    Puedes ayudar con:
    - Gestión de tareas y recordatorios
    - Establecimiento y seguimiento de hábitos
    - Consejos de productividad y bienestar
    - Organización personal
    
    Mantén un tono amigable y cercano. Usa emojis ocasionalmente para dar calidez a tus respuestas.
    Si no sabes algo, admítelo honestamente y ofrece alternativas.`
  };
  
  // Convertir los mensajes del chat al formato que espera OpenAI
  const formattedMessages = chatMessages.map(msg => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text
  }));
  
  // Limitar a los últimos 10 mensajes para no exceder el contexto
  const recentMessages = formattedMessages.slice(-10);
  
  // Añadir el mensaje de sistema al principio
  return [systemMessage, ...recentMessages];
};