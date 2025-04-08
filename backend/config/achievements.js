export const ACHIEVEMENTS = {
  // Logros de Tareas (8 logros)
  FIRST_TASK: {
    id: 'FIRST_TASK',
    title: "Primera Tarea",
    description: "Completaste tu primera tarea",
    icon: "checkbox-marked-circle-outline",
    category: "tasks",
    points: 10
  },
  TASK_MASTER_I: {
    id: 'TASK_MASTER_I',
    title: "Organizador Novato",
    description: "Completaste 10 tareas",
    icon: "checkbox-marked-circle",
    category: "tasks",
    points: 25
  },
  TASK_MASTER_II: {
    id: 'TASK_MASTER_II',
    title: "Organizador Experto",
    description: "Completaste 50 tareas",
    icon: "star-circle",
    category: "tasks",
    points: 50
  },
  TASK_MASTER_III: {
    id: 'TASK_MASTER_III',
    title: "Maestro de Tareas",
    description: "Completaste 100 tareas",
    icon: "star-circle-outline",
    category: "tasks",
    points: 100
  },
  PRIORITY_MASTER: {
    id: 'PRIORITY_MASTER',
    title: "Maestro de Prioridades",
    description: "Completa 10 tareas de alta prioridad",
    icon: "alert-decagram",
    category: "tasks",
    points: 40
  },
  QUICK_ACHIEVER: {
    id: 'QUICK_ACHIEVER',
    title: "Velocista",
    description: "Completa 5 tareas en un día",
    icon: "timer-outline",
    category: "tasks",
    points: 35
  },
  WEEKEND_WARRIOR: {
    id: 'WEEKEND_WARRIOR',
    title: "Guerrero del Fin de Semana",
    description: "Completa 10 tareas durante el fin de semana",
    icon: "calendar-weekend",
    category: "tasks",
    points: 45
  },
  EARLY_BIRD: {
    id: 'EARLY_BIRD',
    title: "Madrugador",
    description: "Completa 5 tareas antes de las 9 AM",
    icon: "weather-sunny",
    category: "tasks",
    points: 50
  },

  // Logros de Hábitos (8 logros)
  FIRST_HABIT: {
    id: 'FIRST_HABIT',
    title: "Primer Hábito",
    description: "Creaste tu primer hábito",
    icon: "lightning-bolt-outline",
    category: "habits",
    points: 10
  },
  HABIT_COLLECTOR: {
    id: 'HABIT_COLLECTOR',
    title: "Coleccionista",
    description: "Creaste 5 hábitos diferentes",
    icon: "lightning-bolt",
    category: "habits",
    points: 25
  },
  HABIT_STREAK_I: {
    id: 'HABIT_STREAK_I',
    title: "Racha Inicial",
    description: "Mantén un hábito por 7 días",
    icon: "fire",
    category: "habits",
    points: 30
  },
  HABIT_STREAK_II: {
    id: 'HABIT_STREAK_II',
    title: "Constancia",
    description: "Mantén un hábito por 30 días",
    icon: "fire-circle",
    category: "habits",
    points: 75
  },
  HABIT_MASTER: {
    id: 'HABIT_MASTER',
    title: "Maestro de Hábitos",
    description: "Completa todos tus hábitos durante 7 días seguidos",
    icon: "crown",
    category: "habits",
    points: 100
  },
  MORNING_ROUTINE: {
    id: 'MORNING_ROUTINE',
    title: "Rutina Matutina",
    description: "Completa 3 hábitos antes de las 10 AM",
    icon: "white-balance-sunny",
    category: "habits",
    points: 40
  },
  HABIT_DIVERSITY: {
    id: 'HABIT_DIVERSITY',
    title: "Diversidad",
    description: "Mantén activos hábitos de todas las categorías",
    icon: "palette-outline",
    category: "habits",
    points: 60
  },
  PERFECT_WEEK: {
    id: 'PERFECT_WEEK',
    title: "Semana Perfecta",
    description: "Completa todos tus hábitos durante una semana entera",
    icon: "calendar-check",
    category: "habits",
    points: 80
  },

  // Logros de Rachas (8 logros)
  FIRST_STREAK: {
    id: 'FIRST_STREAK',
    title: "Primera Racha",
    description: "Alcanza una racha de 3 días",
    icon: "trending-up",
    category: "streaks",
    points: 15
  },
  STREAK_MASTER_I: {
    id: 'STREAK_MASTER_I',
    title: "Racha Semanal",
    description: "Mantén una racha de 7 días",
    icon: "chart-line",
    category: "streaks",
    points: 30
  },
  STREAK_MASTER_II: {
    id: 'STREAK_MASTER_II',
    title: "Racha Mensual",
    description: "Mantén una racha de 30 días",
    icon: "chart-line-variant",
    category: "streaks",
    points: 100
  },
  STREAK_MASTER_III: {
    id: 'STREAK_MASTER_III',
    title: "Racha Legendaria",
    description: "Mantén una racha de 100 días",
    icon: "crown-circle",
    category: "streaks",
    points: 250
  },
  COMEBACK_KID: {
    id: 'COMEBACK_KID',
    title: "El Regreso",
    description: "Recupera una racha después de perderla",
    icon: "restart",
    category: "streaks",
    points: 20
  },
  MULTI_STREAKER: {
    id: 'MULTI_STREAKER',
    title: "Multi Racha",
    description: "Mantén 3 rachas simultáneas de 7 días",
    icon: "ray-start-arrow",
    category: "streaks",
    points: 70
  },
  STREAK_SURVIVOR: {
    id: 'STREAK_SURVIVOR',
    title: "Superviviente",
    description: "Mantén una racha a pesar de completarla tarde",
    icon: "shield-check",
    category: "streaks",
    points: 25
  },
  STREAK_PERFECTIONIST: {
    id: 'STREAK_PERFECTIONIST',
    title: "Perfeccionista",
    description: "Completa una racha de 30 días sin fallar ni una vez",
    icon: "diamond-stone",
    category: "streaks",
    points: 150
  },

  // Logros Generales (8 logros)
  WELCOME: {
    id: 'WELCOME',
    title: "¡Bienvenido!",
    description: "Te uniste a Anto",
    icon: "account-check",
    category: "general",
    points: 5
  },
  PROFILE_COMPLETE: {
    id: 'PROFILE_COMPLETE',
    title: "Perfil Completo",
    description: "Completa toda la información de tu perfil",
    icon: "account-star",
    category: "general",
    points: 15
  },
  EXPLORER: {
    id: 'EXPLORER',
    title: "Explorador",
    description: "Visita todas las secciones de la app",
    icon: "compass",
    category: "general",
    points: 20
  },
  FIRST_WEEK: {
    id: 'FIRST_WEEK',
    title: "Primera Semana",
    description: "Usa la app durante 7 días seguidos",
    icon: "calendar-week",
    category: "general",
    points: 25
  },
  DEDICATED_USER: {
    id: 'DEDICATED_USER',
    title: "Usuario Dedicado",
    description: "Usa la app durante 30 días seguidos",
    icon: "calendar-star",
    category: "general",
    points: 50
  },
  NIGHT_OWL: {
    id: 'NIGHT_OWL',
    title: "Búho Nocturno",
    description: "Completa actividades después de las 10 PM",
    icon: "weather-night",
    category: "general",
    points: 30
  },
  SOCIAL_BUTTERFLY: {
    id: 'SOCIAL_BUTTERFLY',
    title: "Mariposa Social",
    description: "Comparte tus logros en redes sociales",
    icon: "share-variant",
    category: "general",
    points: 20
  },
  MILESTONE_MASTER: {
    id: 'MILESTONE_MASTER',
    title: "Maestro de Hitos",
    description: "Alcanza 1000 puntos totales",
    icon: "trophy-variant",
    category: "general",
    points: 100
  }
};

export default ACHIEVEMENTS;
