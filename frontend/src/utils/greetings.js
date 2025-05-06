const greetingsRepertoire = {
  madrugada: [
    "¡Hola! Espero que estés bien a esta hora",
    "¡Hola noctámbulo! Aquí estoy para escucharte",
    "¡Hola! ¿Necesitas desahogarte a esta hora?",
    "¡Hola! Recuerda que siempre puedes contar con Anto, sin importar la hora"
  ],
  mañana: [
    "Buenos días",
    "¡Buen día! Que tengas una jornada positiva",
    "¡Hola! ¿Listo para un nuevo día?",
    "¡Buenos días! Hoy es un buen día para cuidar de ti"
  ],
  mediodia: [
    "Buen mediodía",
    "¡Hola! ¿Cómo va tu día hasta ahora?",
    "¡Buen mediodía! Tómate un momento para respirar",
    "¡Hola! Recuerda hacer una pausa y cuidarte"
  ],
  tarde: [
    "Buenas tardes",
    "¡Hola! Espero que tu tarde sea tranquila",
    "¡Buenas tardes! ¿Cómo te sientes hoy?",
    "¡Hola! Aquí estoy para acompañarte esta tarde"
  ],
  noche: [
    "Buenas noches",
    "¡Hola! Espero que tengas una noche reparadora",
    "¡Buenas noches! Es un buen momento para reflexionar",
    "¡Hola! Si necesitas hablar antes de dormir, aquí estoy"
  ]
};

export function getGreetingByHour(hour = new Date().getHours()) {
  if (hour >= 0 && hour < 6) {
    return randomFromArray(greetingsRepertoire.madrugada);
  } else if (hour >= 6 && hour < 12) {
    return randomFromArray(greetingsRepertoire.mañana);
  } else if (hour >= 12 && hour < 14) {
    return randomFromArray(greetingsRepertoire.mediodia);
  } else if (hour >= 14 && hour < 19) {
    return randomFromArray(greetingsRepertoire.tarde);
  } else {
    return randomFromArray(greetingsRepertoire.noche);
  }
}

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
