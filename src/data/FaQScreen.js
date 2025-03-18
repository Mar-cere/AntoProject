// Datos de preguntas frecuentes organizados por categorías
const faqData = [
  {
    category: "Sobre la Aplicación",
    items: [
      {
        question: "¿Qué es Anto?",
        answer: "Anto es tu asistente personal para la salud mental y el bienestar emocional. Su función principal es ser un psicólogo virtual con inteligencia artificial, brindándote apoyo a través de un chat interactivo. Además, te ayuda a gestionar tus tareas, hábitos y emociones, con el objetivo de mejorar tu bienestar diario."
      },
      {
        question: "¿Cómo puedo sacar el máximo provecho de la aplicación?",
        answer: "Para aprovechar al máximo Anto, te recomendamos:\n1) Conversar con Anto regularmente para recibir apoyo emocional.\n2) Registrar tu estado de ánimo diariamente para identificar patrones.\n3) Usar el sistema de hábitos y tareas para organizarte mejor.\n4) Explorar el Journal para escribir tus reflexiones y emociones.\n5) Revisar tus estadísticas para conocer tu progreso."
      },
      {
        question: "¿Puedo usar Anto sin conexión?",
        answer: "Algunas funciones como el registro de hábitos y tareas están disponibles sin conexión. Sin embargo, el **chat con Anto requiere acceso a internet**, ya que la IA necesita conectarse a sus servidores para generar respuestas en tiempo real."
      }
    ]
  },
  {
    category: "Chat con Anto",
    items: [
      {
        question: "¿Cómo funciona el chat con Anto?",
        answer: "El chat con Anto es el corazón de la aplicación. Puedes hablar sobre cómo te sientes, pedir consejos o simplemente desahogarte. Anto usa inteligencia artificial para comprender tus respuestas y brindarte apoyo personalizado. Cuanto más interactúes, mejor se adaptará a tus necesidades."
      },
      {
        question: "¿Anto puede reemplazar a un psicólogo?",
        answer: "Anto es una herramienta de apoyo emocional basada en IA, pero **no reemplaza a un profesional de la salud mental**. Su objetivo es acompañarte y ayudarte en tu bienestar diario. Si necesitas ayuda profesional, Anto puede sugerirte cuándo es recomendable acudir a un especialista."
      },
      {
        question: "¿El chat con Anto es privado y seguro?",
        answer: "Sí. Todas tus conversaciones están protegidas con **cifrado de extremo a extremo**, lo que significa que ni siquiera nosotros podemos acceder a ellas. Tu privacidad es nuestra prioridad."
      }
    ]
  },
  {
    category: "Funcionalidades",
    items: [
      {
        question: "¿Cómo funciona el sistema de puntos?",
        answer: "Cada acción en la app te otorga puntos:\n✔️ Hablar con Anto: 20 puntos\n✔️ Registrar tu estado de ánimo: 10 puntos\n✔️ Completar tareas: 10 puntos\n✔️ Mantener hábitos: 20 puntos\n✔️ Desbloquear logros: 50 puntos\nEstos puntos reflejan tu progreso y pueden usarse para desbloquear funciones adicionales."
      },
      {
        question: "¿Cómo puedo gestionar mis hábitos?",
        answer: "Ve a la sección de Hábitos y pulsa el botón '+' para añadir uno nuevo. Puedes personalizar su frecuencia, establecer recordatorios y hacer seguimiento de tu progreso con gráficos intuitivos. También puedes editarlos o eliminarlos en cualquier momento."
      },
      {
        question: "¿Puedo llevar un diario en Anto?",
        answer: "Sí. En la sección **Journal**, puedes escribir tus pensamientos, emociones y reflexiones diarias. Todo tu contenido se guarda de forma segura y es 100% privado."
      },
      {
        question: "¿Anto está disponible en varios idiomas?",
        answer: "Actualmente, Anto está disponible en español. Estamos trabajando para incluir más idiomas en futuras actualizaciones."
      }
    ]
  },
  {
    category: "Privacidad y Seguridad",
    items: [
      {
        question: "¿Mis datos están protegidos?",
        answer: "Sí, usamos **cifrado de alto nivel** para proteger tu información. **Tus datos no son compartidos con terceros**, y ni siquiera nosotros tenemos acceso a tus conversaciones con Anto."
      },
      {
        question: "¿Puedo descargar mis datos?",
        answer: "Sí. Puedes exportar toda tu información desde **Ajustes > Datos personales > Exportar datos**."
      }
    ]
  },
  {
    category: "Futuras Mejoras y Sugerencias",
    items: [
      {
        question: "¿Qué nuevas funciones están en desarrollo?",
        answer: "Estamos trabajando en:\n- **Un modo avanzado para el chat con IA**, con respuestas aún más personalizadas.\n- **Más herramientas de bienestar**, como ejercicios de relajación y control de estrés.\n- **Integraciones con otras apps**, para mejorar tu productividad y bienestar general."
      },
      {
        question: "¿Dónde puedo sugerir mejoras para Anto?",
        answer: "Puedes enviarnos ideas desde **Ajustes > Ayuda > Sugerencias**. Nos encanta escuchar a nuestros usuarios para seguir mejorando la aplicación."
      }
    ]
  }
];

export default faqData;
