import AsyncStorage from '@react-native-async-storage/async-storage';

// Función para obtener una pregunta socrática apropiada según el contexto
export const getSocraticQuestion = async (temas = '', lastMessage = '') => {
  try {
    // Obtener perfil del usuario
    const userProfileData = await AsyncStorage.getItem('userProfile');
    const userProfile = userProfileData ? JSON.parse(userProfileData) : {};
    
    // Personalizar categorías según preferencias o necesidades del usuario
    let preferredCategories = ['general'];
    
    if (userProfile.preferredApproach === 'cognitive') {
      preferredCategories.push('beliefs');
    } else if (userProfile.preferredApproach === 'emotional') {
      preferredCategories.push('emotions');
    } else if (userProfile.preferredApproach === 'behavioral') {
      preferredCategories.push('behaviors');
    } else if (userProfile.preferredApproach === 'existential') {
      preferredCategories.push('values');
    } else if (userProfile.preferredApproach === 'interpersonal') {
      preferredCategories.push('relationships');
    }
    
    // Obtener el historial de preguntas recientes para evitar repeticiones
    const recentQuestionsData = await AsyncStorage.getItem('recentSocraticQuestions');
    const recentQuestions = recentQuestionsData ? JSON.parse(recentQuestionsData) : [];
    
    // Categorías de preguntas socráticas
    const questionCategories = {
      // Preguntas sobre creencias y pensamientos
      beliefs: [
        "¿Qué evidencia tienes para apoyar ese pensamiento?",
        "¿Hay alguna evidencia que contradiga esa creencia?",
        "¿Cómo sabrías si ese pensamiento es completamente cierto?",
        "¿Qué otras explicaciones podrían existir para esta situación?",
        "Si un amigo pensara esto, ¿qué le dirías?",
        "¿Cómo llegaste a esa conclusión?",
        "¿Qué asunciones estás haciendo en este momento?"
      ],
      
      // Preguntas sobre emociones
      emotions: [
        "¿Qué te dice esta emoción sobre lo que valoras?",
        "¿Cómo cambia tu comportamiento cuando sientes esto?",
        "¿Dónde sientes esta emoción en tu cuerpo?",
        "¿Qué necesidad podría estar expresando esta emoción?",
        "Si esta emoción pudiera hablar, ¿qué mensaje te estaría dando?",
        "¿Qué otras emociones podrían estar debajo de lo que estás sintiendo?",
        "¿Cómo sería observar esta emoción con curiosidad en lugar de juicio?"
      ],
      
      // Preguntas sobre comportamientos
      behaviors: [
        "¿Qué consigues cuando actúas de esta manera?",
        "¿Qué precio pagas por mantener este comportamiento?",
        "¿Cómo sería actuar de manera diferente?",
        "¿Qué te impide probar una aproximación distinta?",
        "¿Qué pequeño paso podrías dar en otra dirección?",
        "¿Cómo se alinea este comportamiento con tus valores?",
        "¿Qué aprendiste de situaciones similares en el pasado?"
      ],
      
      // Preguntas sobre valores y significado
      values: [
        "¿Qué dice esta situación sobre lo que es importante para ti?",
        "¿Cómo sería vivir más alineado con tus valores en este aspecto?",
        "¿Qué cualidad personal te gustaría desarrollar a través de este desafío?",
        "¿Qué significado podrías crear a partir de esta experiencia?",
        "¿Qué te enseña esta situación sobre ti mismo?",
        "¿Cómo te gustaría recordar haber manejado este momento?",
        "¿Qué historia te estás contando sobre quién eres en relación a esto?"
      ],
      
      // Preguntas sobre relaciones
      relationships: [
        "¿Qué necesitas de esta relación que no estás recibiendo?",
        "¿Qué podría estar necesitando la otra persona?",
        "¿Cómo contribuyes a este patrón relacional?",
        "¿Qué asumes sobre las intenciones de la otra persona?",
        "¿Qué conversación difícil podría ser necesaria?",
        "¿Cómo sería establecer un límite saludable en esta situación?",
        "¿Qué aprendiste sobre relaciones en tu familia de origen?"
      ],
      
      // Preguntas generales
      general: [
        "¿Qué te gustaría explorar más profundamente sobre esto?",
        "¿Qué pregunta te estás haciendo a ti mismo sobre esta situación?",
        "¿Qué parte de ti necesita ser escuchada en este momento?",
        "¿Qué recursos internos podrías activar para afrontar esto?",
        "¿Qué sabiduría has ganado de experiencias similares?",
        "¿Qué te sorprende de cómo estás manejando esto?",
        "¿Qué te gustaría que fuera diferente?"
      ]
    };
    
    // Dar mayor peso a las categorías preferidas
    const relevantCategories = [...preferredCategories];
    
    const lowerTemas = temas.toLowerCase();
    const lowerMessage = lastMessage.toLowerCase();
    
    if (lowerTemas.includes('pensa') || lowerTemas.includes('creen') || 
        lowerMessage.includes('pienso') || lowerMessage.includes('creo')) {
      relevantCategories.push('beliefs');
    }
    
    if (lowerTemas.includes('emoci') || lowerTemas.includes('senti') || 
        lowerMessage.includes('siento') || lowerMessage.includes('emocion')) {
      relevantCategories.push('emotions');
    }
    
    if (lowerTemas.includes('comport') || lowerTemas.includes('accion') || 
        lowerMessage.includes('hice') || lowerMessage.includes('actuar')) {
      relevantCategories.push('behaviors');
    }
    
    if (lowerTemas.includes('valor') || lowerTemas.includes('signific') || 
        lowerMessage.includes('importante') || lowerMessage.includes('sentido')) {
      relevantCategories.push('values');
    }
    
    if (lowerTemas.includes('relacion') || lowerTemas.includes('pareja') || 
        lowerMessage.includes('amigo') || lowerMessage.includes('familia')) {
      relevantCategories.push('relationships');
    }
    
    // Seleccionar categoría con preferencia a las del perfil del usuario
    const weightedCategories = relevantCategories.map(cat => 
      preferredCategories.includes(cat) ? [cat, cat] : [cat]
    ).flat();
    
    const selectedCategory = weightedCategories[Math.floor(Math.random() * weightedCategories.length)];
    
    // Obtener preguntas de la categoría seleccionada
    const categoryQuestions = questionCategories[selectedCategory];
    
    // Filtrar preguntas que no se hayan usado recientemente
    const availableQuestions = categoryQuestions.filter(q => !recentQuestions.includes(q));
    
    // Si todas las preguntas se han usado recientemente, reiniciar
    const questionsToChooseFrom = availableQuestions.length > 0 ? availableQuestions : categoryQuestions;
    
    // Seleccionar una pregunta aleatoria
    const selectedQuestion = questionsToChooseFrom[Math.floor(Math.random() * questionsToChooseFrom.length)];
    
    // Actualizar el historial de preguntas recientes (mantener las últimas 10)
    const updatedRecentQuestions = [selectedQuestion, ...recentQuestions].slice(0, 10);
    await AsyncStorage.setItem('recentSocraticQuestions', JSON.stringify(updatedRecentQuestions));
    
    return selectedQuestion;
  } catch (error) {
    console.error('Error al obtener pregunta socrática:', error);
    return "¿Qué piensas sobre esto?"; // Pregunta por defecto en caso de error
  }
}; 