const quotes = [
  // Frases originales
  "El único modo de hacer un gran trabajo es amar lo que haces.",
  "No cuentes los días, haz que los días cuenten.",
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "La mejor forma de predecir el futuro es creándolo.",
  "Nunca es demasiado tarde para ser lo que podrías haber sido.",
  
  // Frases sobre superación personal
  "El fracaso es solo la oportunidad de comenzar de nuevo de forma más inteligente.",
  "La persistencia puede cambiar el fracaso en un logro extraordinario.",
  "Los desafíos son lo que hacen la vida interesante, superarlos es lo que hace la vida significativa.",
  "No importa lo lento que vayas mientras no te detengas.",
  "La fortaleza no viene de lo que puedes hacer, sino de superar lo que pensabas que no podías.",
  
  // Frases sobre actitud positiva
  "Tu actitud, no tu aptitud, determinará tu altitud.",
  "La felicidad no es algo hecho. Viene de tus propias acciones.",
  "Una actitud positiva te da poder sobre tus circunstancias en lugar de que tus circunstancias tengan poder sobre ti.",
  "La vida es 10% lo que te sucede y 90% cómo reaccionas ante ello.",
  "Cada día es una nueva oportunidad para cambiar tu vida.",
  
  // Frases sobre bienestar emocional
  "Cuidar de ti mismo no es un lujo, es una necesidad.",
  "La paz comienza con una sonrisa.",
  "Respira profundo. Todo estará bien.",
  "El autocuidado no es egoísmo. No puedes servir de una taza vacía.",
  "Eres más fuerte de lo que crees, más valiente de lo que pareces y más inteligente de lo que piensas.",
  
  // Frases sobre crecimiento personal
  "El crecimiento comienza donde termina tu zona de confort.",
  "La vida comienza al final de tu zona de confort.",
  "Convierte tus heridas en sabiduría.",
  "El mayor descubrimiento de mi generación es que un ser humano puede cambiar su vida cambiando su actitud mental.",
  "No hay nada noble en ser superior a tu prójimo; la verdadera nobleza es ser superior a tu yo anterior.",
  
  // Frases sobre resiliencia
  "La resiliencia no es lo que te pasa, sino cómo reaccionas y te recuperas.",
  "Las dificultades preparan a personas comunes para destinos extraordinarios.",
  "Cuando todo parece ir en tu contra, recuerda que el avión despega contra el viento.",
  "No es la carga lo que te rompe, es la forma en que la llevas.",
  "La vida no se trata de esperar a que pase la tormenta, se trata de aprender a bailar bajo la lluvia.",
  
  // Frases sobre mindfulness y presente
  "El presente es un regalo, por eso se llama presente.",
  "La vida solo puede ser entendida mirando hacia atrás, pero debe ser vivida mirando hacia adelante.",
  "Ayer es historia, mañana es un misterio, pero hoy es un regalo. Por eso se llama presente.",
  "No dejes que el ayer tome demasiado del hoy.",
  "Vive el momento. Respira el momento.",
  
  // Frases sobre propósito y significado
  "El propósito de la vida es una vida con propósito.",
  "El significado de la vida es encontrar tu don. El propósito de la vida es regalarlo.",
  "Lo que haces marca una diferencia, y tienes que decidir qué tipo de diferencia quieres marcar.",
  "No preguntes qué necesita el mundo. Pregunta qué te hace sentir vivo, porque lo que el mundo necesita es gente que se sienta viva.",
  "Tu trabajo va a llenar gran parte de tu vida, y la única manera de estar realmente satisfecho es hacer lo que creas que es un gran trabajo.",
  
  // Frases sobre relaciones y conexión
  "Las personas olvidarán lo que dijiste, olvidarán lo que hiciste, pero nunca olvidarán cómo las hiciste sentir.",
  "La conexión es por qué estamos aquí. Nos da propósito y significado a nuestras vidas.",
  "La empatía es ver con los ojos de otro, escuchar con los oídos de otro y sentir con el corazón de otro.",
  "La bondad es un lenguaje que los sordos pueden oír y los ciegos pueden ver.",
  "Un amigo es alguien que te conoce tal como eres, comprende dónde has estado, acepta en lo que te has convertido y aun así, gentilmente te permite crecer.",
  
  // Frases sobre autenticidad
  "Sé tú mismo, todos los demás ya están ocupados.",
  "La autenticidad es la práctica diaria de soltar quién pensamos que deberíamos ser y abrazar quiénes somos.",
  "Cuando eres fiel a ti mismo, todo encaja naturalmente.",
  "Tu tiempo es limitado, no lo desperdicies viviendo la vida de alguien más.",
  "La mayor libertad es ser tú mismo.",

  // Nuevas categorías y frases

  // Frases sobre confianza
  "La confianza en ti mismo es el primer secreto del éxito.",
  "Cree en ti mismo y todo será posible.",
  "La confianza no viene de tener todas las respuestas, sino de estar abierto a todas las preguntas.",
  "Tu potencial es ilimitado cuando crees en ti mismo.",
  "La confianza es el puente entre el pensamiento y la acción.",

  // Frases sobre perseverancia
  "La perseverancia es el trabajo duro que haces después de cansarte del trabajo duro que ya hiciste.",
  "El éxito no es final, el fracaso no es fatal: lo que cuenta es el coraje para continuar.",
  "La perseverancia es el secreto de todos los triunfos.",
  "No te rindas, las mejores cosas de la vida suelen ocurrir justo cuando estás a punto de darte por vencido.",
  "La perseverancia transforma el fracaso en logro extraordinario.",

  // Frases sobre gratitud
  "La gratitud convierte lo que tenemos en suficiente.",
  "La gratitud es la memoria del corazón.",
  "Cuando damos gracias por lo que tenemos, siempre tenemos más por lo que dar gracias.",
  "La gratitud es la mejor actitud.",
  "La vida es un regalo, y la gratitud es la forma de abrirlo.",

  // Frases sobre cambio
  "El cambio es inevitable, el crecimiento es opcional.",
  "El cambio comienza cuando decides ser diferente.",
  "No esperes que las cosas cambien, cambia tú primero.",
  "El cambio es la única constante en la vida.",
  "Cada día es una oportunidad para ser una mejor versión de ti mismo.",

  // Frases sobre sueños
  "Los sueños no funcionan a menos que tú lo hagas.",
  "No dejes que tus sueños sean solo sueños.",
  "Los sueños son el combustible que impulsa el logro.",
  "Cada gran logro comenzó con un sueño.",
  "Los sueños son el lenguaje del alma.",

  // Frases sobre equilibrio
  "El equilibrio no es algo que encuentras, es algo que creas.",
  "La vida es como montar en bicicleta, para mantener el equilibrio debes seguir moviéndote.",
  "El equilibrio es la clave de una vida plena.",
  "Encuentra tu equilibrio y encontrarás tu paz.",
  "El equilibrio entre dar y recibir es el secreto de la felicidad.",

  // Frases sobre aprendizaje
  "El aprendizaje es un tesoro que seguirá a su dueño a todas partes.",
  "Cada día es una oportunidad para aprender algo nuevo.",
  "El aprendizaje es un viaje, no un destino.",
  "La vida es el mejor maestro, siempre que estés dispuesto a aprender.",
  "El conocimiento es poder, pero el aprendizaje es superpoder.",

  // Frases sobre esperanza
  "La esperanza es el sueño del alma despierta.",
  "Donde hay esperanza, hay vida.",
  "La esperanza es la única cosa más fuerte que el miedo.",
  "La esperanza es el ancla del alma.",
  "La esperanza es la capacidad de ver la luz a pesar de la oscuridad."
];

export default quotes;