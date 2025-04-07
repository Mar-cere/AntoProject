export const ACHIEVEMENTS = {
  // Logros de Tareas
  FIRST_TASK: {
    id: 'FIRST_TASK',
    title: "Primera Tarea",
    description: "Completaste tu primera tarea",
    icon: "checkbox-marked-circle",
    category: "tasks",
    points: 10
  },
  TASK_MASTER: {
    id: 'TASK_MASTER',
    title: "Maestro de Tareas",
    description: "Completaste 10 tareas",
    icon: "star-circle",
    category: "tasks",
    points: 50
  },

  // Logros de Hábitos
  FIRST_HABIT: {
    id: 'FIRST_HABIT',
    title: "Primer Hábito",
    description: "Creaste tu primer hábito",
    icon: "lightning-bolt",
    category: "habits",
    points: 10
  },
  HABIT_STREAK: {
    id: 'HABIT_STREAK',
    title: "Racha Inicial",
    description: "7 días manteniendo un hábito",
    icon: "fire",
    category: "habits",
    points: 30
  },

  // Logros Generales
  WELCOME: {
    id: 'WELCOME',
    title: "¡Bienvenido!",
    description: "Te uniste a Anto",
    icon: "account-check",
    category: "general",
    points: 5
  }
};

export default ACHIEVEMENTS;
