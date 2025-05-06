const greetingsRepertoire = {
  madrugada: [
    "Aquí estoy para ti",
    "¿Despierto a esta hora? Cuenta conmigo",
    "Siempre disponible, incluso de madrugada",
    "Un abrazo nocturno"
  ],
  mañana: [
    "Buenos días",
    "¡Buen día!",
    "¡Hola! Que tengas un gran día",
    "Energía para hoy"
  ],
  mediodia: [
    "Buen mediodía",
    "¡Hola!",
    "Pausa y respira",
    "Mitad del día, ¡ánimo!"
  ],
  tarde: [
    "Buenas tardes",
    "¡Hola!",
    "Sigue adelante esta tarde",
    "Aquí para ti esta tarde"
  ],
  noche: [
    "Buenas noches",
    "Que descanses",
    "Aquí si necesitas hablar",
    "Noche tranquila"
  ]
};

const diasSemana = [
  "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
];

export function getGreetingByHourAndDayAndName({ hour = new Date().getHours(), dayIndex = new Date().getDay(), userName = "" } = {}) {
  let baseGreeting = '';
  if (hour >= 0 && hour < 6) {
    baseGreeting = randomFromArray(greetingsRepertoire.madrugada);
  } else if (hour >= 6 && hour < 12) {
    baseGreeting = randomFromArray(greetingsRepertoire.mañana);
  } else if (hour >= 12 && hour < 14) {
    baseGreeting = randomFromArray(greetingsRepertoire.mediodia);
  } else if (hour >= 14 && hour < 19) {
    baseGreeting = randomFromArray(greetingsRepertoire.tarde);
  } else {
    baseGreeting = randomFromArray(greetingsRepertoire.noche);
  }

  const dia = diasSemana[dayIndex];

  // Saludo breve y personalizado, día en nueva línea
  if (userName) {
    return `${baseGreeting}, ${userName}.\nFeliz ${dia}`;
  }
  return `${baseGreeting}.\nFeliz ${dia}`;
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
