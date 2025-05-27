import Message from './Message.js';
import UserProfile from './UserProfile.js';
import TherapeuticRecord from './TherapeuticRecord.js';
import UserProgress from './UserProgress.js';
import UserInsight from './UserInsight.js';
import User from './User.js';
import Habit from './Habit.js';
import Task from './Task.js';
import UserGoals from './UserGoals.js';

// Validar que todos los modelos estén correctamente exportados
const models = {
  Message,
  UserProfile,
  TherapeuticRecord,
  UserProgress,
  UserInsight,
  User,
  Habit,
  Task,
  UserGoals
};

// Verificar que cada modelo sea válido
Object.entries(models).forEach(([name, model]) => {
  if (!model?.modelName) {
    console.warn(`Advertencia: El modelo ${name} podría no estar correctamente definido`);
  }
});

export {
  Message,
  UserProfile,
  TherapeuticRecord,
  UserProgress,
  UserInsight,
  User,
  Habit,
  Task,
  UserGoals
};

export default models; 