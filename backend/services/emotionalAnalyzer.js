const emotionalAnalyzer = {
  emotions: {
    tristeza: {
      patterns: /(?:triste|deprimid|desanimad|solo|melanc|llorar|no me siento bien|mal|desánimo|sin ganas)/i,
      intensity_modifiers: {
        high: /(?:muy|mucho|demasiado|terrible|horrible|insoportable)/i,
        medium: /(?:bastante|algo|un poco|más o menos)/i
      },
      responses: {
        validation: [
          "Entiendo que este momento sea difícil para ti. ¿Te gustaría hablar más sobre lo que está pasando?",
          "A veces nos sentimos así y está bien reconocerlo. ¿Qué crees que te ayudaría en este momento?",
          "Valoro que compartas cómo te sientes. ¿Hay algo específico que te preocupe?",
          "Es importante poder expresar estos sentimientos. ¿Desde cuándo te sientes de esta manera?"
        ],
        exploration: [
          "¿Qué situaciones suelen hacerte sentir así?",
          "¿Has notado algún cambio en tu rutina diaria últimamente?",
          "¿Hay personas con las que te sientas cómodo hablando de esto?",
          "¿Qué cosas solían ayudarte cuando te sentías así antes?"
        ],
        support: [
          "Podemos explorar juntos qué factores están influyendo en cómo te sientes",
          "A veces, entender el origen de nuestras emociones nos ayuda a manejarlas mejor",
          "Es válido buscar apoyo cuando lo necesitamos",
          "Podemos analizar esto paso a paso"
        ],
        approaches: [
          "Exploración de patrones emocionales",
          "Identificación de factores desencadenantes",
          "Análisis de red de apoyo",
          "Reconocimiento de recursos personales"
        ]
      }
    },
    ansiedad: {
      patterns: /(?:ansios|nervios|angustia|preocup|inquiet|estres|tensión|agobio|pánico)/i,
      intensity_modifiers: {
        high: /(?:mucho|demasiado|pánico|crisis|ataque)/i,
        medium: /(?:algo|un poco|leve|ligero)/i
      },
      responses: {
        validation: [
          "Entiendo que la incertidumbre puede ser abrumadora. ¿Quieres hablar sobre lo que te preocupa?",
          "Es natural sentirse así ante situaciones que nos generan inquietud. ¿Qué pensamientos te rondan?",
          "La ansiedad suele aparecer cuando enfrentamos desafíos importantes. ¿Qué está pasando?",
          "A veces nos anticipamos a escenarios difíciles. ¿Qué te preocupa específicamente?"
        ],
        exploration: [
          "¿Has identificado situaciones específicas que disparan esta ansiedad?",
          "¿Cómo afecta esto tu día a día?",
          "¿Qué estrategias has encontrado útiles hasta ahora?",
          "¿Hay personas o situaciones que te ayuden a sentirte más tranquilo?"
        ],
        support: [
          "Podemos analizar juntos estas preocupaciones y ver qué hay detrás",
          "A veces, compartir nuestras preocupaciones nos ayuda a verlas más claramente",
          "Es importante entender qué nos genera ansiedad para poder manejarlo mejor",
          "Podemos explorar diferentes perspectivas sobre la situación"
        ],
        approaches: [
          "Análisis de pensamientos automáticos",
          "Exploración de escenarios realistas",
          "Identificación de recursos personales",
          "Desarrollo de estrategias de afrontamiento"
        ]
      }
    },
    frustración: {
      patterns: /(?:frustrad|molest|enoj|rabia|impotencia|no puedo|ira|bronca|fastidio)/i,
      intensity_modifiers: {
        high: /(?:mucho|demasiado|muy|extremadamente)/i,
        medium: /(?:algo|un poco|bastante)/i
      },
      responses: {
        validation: [
          "Es comprensible sentirse frustrado cuando las cosas no salen como esperamos. ¿Quieres contarme más?",
          "La frustración nos dice algo importante sobre nuestras expectativas. ¿Qué esperabas que sucediera?",
          "A veces las cosas no salen como planeamos, y eso puede ser muy frustrante. ¿Qué está pasando?",
          "Entiendo tu frustración. ¿Qué te ayudaría a sentirte mejor en este momento?"
        ],
        exploration: [
          "¿Qué expectativas tenías sobre esta situación?",
          "¿Qué aspectos de la situación están bajo tu control?",
          "¿Cómo te gustaría que fuera la situación?",
          "¿Qué alternativas ves posibles?"
        ],
        support: [
          "Podemos analizar la situación desde diferentes ángulos",
          "A veces, revisar nuestras expectativas nos ayuda a encontrar nuevas soluciones",
          "Exploremos qué opciones tienes disponibles",
          "Veamos qué podemos aprender de esta experiencia"
        ],
        approaches: [
          "Análisis de expectativas vs realidad",
          "Exploración de alternativas",
          "Identificación de aspectos controlables",
          "Replanteamiento de objetivos"
        ]
      }
    },
    crisis: {
      patterns: /(?:crisis|emergencia|suicid|no puedo más|ayuda urgente|desesperado|sin salida)/i,
      intensity_modifiers: {
        high: /(?:extremo|urgente|grave|severo)/i,
        medium: /(?:moderado|preocupante)/i
      },
      responses: {
        validation: [
          "Estoy aquí contigo en este momento difícil",
          "Tu vida es valiosa y me importa tu bienestar",
          "No estás solo/a en esto",
          "Entiendo que estés pasando por un momento muy duro"
        ],
        questions: [
          "¿Estás en un lugar seguro en este momento?",
          "¿Hay alguien cerca que pueda acompañarte?",
          "¿Has tenido pensamientos de hacerte daño?",
          "¿Has hablado con algún profesional sobre esto?"
        ],
        support: [
          "Es importante buscar ayuda profesional inmediata",
          "Podemos explorar recursos de apoyo disponibles",
          "Tu seguridad es la prioridad en este momento",
          "Hay personas preparadas para ayudarte"
        ],
        techniques: [
          "Plan de seguridad",
          "Contactos de emergencia",
          "Recursos inmediatos",
          "Líneas de ayuda 24/7"
        ]
      }
    }
  },

  async analyzeEmotion(message) {
    try {
      let detectedEmotion = null;
      let intensity = 5; // Valor base
      let responseType = 'standard';
      let emotionalState = {
        primary: null,
        secondary: [],
        intensity: 0,
        urgency: false
      };

      const content = message.content.toLowerCase();
      const urgentPatterns = /(?:ayuda|urgente|crisis|emergencia|no puedo más)/i;
      const intensifiers = /(?:muy|mucho|demasiado|super|tanto)/gi;
      const mixedEmotions = new Set();

      // Análisis primario de emociones
      for (const [emotion, data] of Object.entries(this.emotions)) {
        if (data.patterns.test(content)) {
          if (!detectedEmotion) {
            detectedEmotion = emotion;
            // Calcular intensidad base
            intensity = this.calculateIntensity(content, data.intensity_modifiers);
          } else {
            mixedEmotions.add(emotion);
          }
        }
      }

      // Ajustar por urgencia
      if (urgentPatterns.test(content)) {
        responseType = 'urgent';
        intensity = Math.min(intensity + 3, 10);
        emotionalState.urgency = true;
      }

      // Ajustar por intensificadores
      const intensifierCount = (content.match(intensifiers) || []).length;
      intensity = Math.min(intensity + intensifierCount, 10);

      emotionalState = {
        primary: detectedEmotion,
        secondary: Array.from(mixedEmotions),
        intensity,
        urgency: responseType === 'urgent'
      };

      return {
        emotion: detectedEmotion,
        intensity,
        responseType,
        emotionalState,
        responses: detectedEmotion ? this.emotions[detectedEmotion].responses : null,
        suggestions: this.generateSuggestions(detectedEmotion, intensity)
      };

    } catch (error) {
      console.error('Error en analyzeEmotion:', error);
      return {
        emotion: 'neutral',
        intensity: 5,
        responseType: 'standard',
        emotionalState: {
          primary: 'neutral',
          secondary: [],
          intensity: 5,
          urgency: false
        },
        responses: null,
        suggestions: []
      };
    }
  },

  calculateIntensity(content, modifiers) {
    if (modifiers.high.test(content)) return 8;
    if (modifiers.medium.test(content)) return 5;
    return 6; // valor por defecto
  },

  generateSuggestions(emotion, intensity) {
    if (!emotion) return [];
    
    const emotionData = this.emotions[emotion];
    const suggestions = [];

    if (intensity >= 8) {
      suggestions.push(...emotionData.responses.techniques.slice(0, 2));
    }
    
    suggestions.push(
      emotionData.responses.support[Math.floor(Math.random() * emotionData.responses.support.length)],
      emotionData.responses.techniques[Math.floor(Math.random() * emotionData.responses.techniques.length)]
    );

    return suggestions;
  }
};

export default emotionalAnalyzer; 