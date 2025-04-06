import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    maxLength: [100, 'El título no puede tener más de 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    default: '',
    maxLength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  icon: {
    type: String,
    required: [true, 'El icono es requerido'],
    enum: {
      values: ['exercise', 'meditation', 'reading', 'water', 'sleep', 'study', 'diet', 'coding'],
      message: 'Icono no válido'
    }
  },
  frequency: {
    type: String,
    enum: {
      values: ['daily', 'weekly'],
      message: 'Frecuencia no válida'
    },
    default: 'daily'
  },
  reminder: {
    time: {
      type: Date,
      required: [true, 'La hora del recordatorio es requerida']
    },
    enabled: {
      type: Boolean,
      default: true
    },
    lastNotified: {
      type: Date,
      default: null
    }
  },
  progress: {
    streak: {
      type: Number,
      default: 0,
      min: [0, 'La racha no puede ser negativa']
    },
    completedDays: {
      type: Number,
      default: 0,
      min: [0, 'Los días completados no pueden ser negativos']
    },
    totalDays: {
      type: Number,
      default: 0,
      min: [0, 'Los días totales no pueden ser negativos']
    },
    bestStreak: {
      type: Number,
      default: 0
    },
    weeklyProgress: [{
      week: Number,
      year: Number,
      completedDays: Number
    }]
  },
  status: {
    completedToday: {
      type: Boolean,
      default: false
    },
    archived: {
      type: Boolean,
      default: false
    },
    lastCompleted: {
      type: Date,
      default: null
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
habitSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Actualizar bestStreak si el streak actual es mayor
  if (this.progress.streak > this.progress.bestStreak) {
    this.progress.bestStreak = this.progress.streak;
  }
  
  next();
});

// Método para marcar como completado
habitSchema.methods.toggleComplete = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const lastCompleted = this.status.lastCompleted ? new Date(this.status.lastCompleted) : null;
  const wasCompletedToday = lastCompleted && 
    lastCompleted.getFullYear() === today.getFullYear() &&
    lastCompleted.getMonth() === today.getMonth() &&
    lastCompleted.getDate() === today.getDate();

  if (wasCompletedToday) {
    this.status.completedToday = false;
    this.status.lastCompleted = null;
    this.progress.streak = Math.max(0, this.progress.streak - 1);
    this.progress.completedDays = Math.max(0, this.progress.completedDays - 1);
  } else {
    this.status.completedToday = true;
    this.status.lastCompleted = now;
    this.progress.streak += 1;
    this.progress.completedDays += 1;
    this.progress.totalDays += 1;
    
    // Actualizar progreso semanal
    const currentWeek = this.getCurrentWeek();
    this.updateWeeklyProgress(currentWeek);
  }

  return this.save();
};

// Método para obtener estadísticas
habitSchema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalHabits: { $sum: 1 },
        activeHabits: { $sum: { $cond: [{ $eq: ['$status.archived', false] }, 1, 0] } },
        totalCompletions: { $sum: '$progress.completedDays' },
        averageStreak: { $avg: '$progress.streak' },
        bestStreak: { $max: '$progress.bestStreak' }
      }
    }
  ]);
};

// Método para obtener el número de semana actual
habitSchema.methods.getCurrentWeek = function() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now - start;
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return {
    week: Math.floor(diff / oneWeek),
    year: now.getFullYear()
  };
};

// Método para actualizar el progreso semanal
habitSchema.methods.updateWeeklyProgress = function(currentWeek) {
  const weekProgress = this.progress.weeklyProgress.find(
    wp => wp.week === currentWeek.week && wp.year === currentWeek.year
  );

  if (weekProgress) {
    weekProgress.completedDays += 1;
  } else {
    this.progress.weeklyProgress.push({
      week: currentWeek.week,
      year: currentWeek.year,
      completedDays: 1
    });
  }
};

// Método para verificar si se debe enviar recordatorio
habitSchema.methods.shouldNotify = function() {
  if (!this.reminder.enabled || this.status.archived || this.status.completedToday) {
    return false;
  }

  const now = new Date();
  const reminderTime = new Date(this.reminder.time);
  const lastNotified = this.reminder.lastNotified ? new Date(this.reminder.lastNotified) : null;

  // Verificar si ya se notificó hoy
  if (lastNotified && 
      lastNotified.getFullYear() === now.getFullYear() &&
      lastNotified.getMonth() === now.getMonth() &&
      lastNotified.getDate() === now.getDate()) {
    return false;
  }

  // Verificar si es la hora del recordatorio
  return now.getHours() === reminderTime.getHours() &&
         now.getMinutes() === reminderTime.getMinutes();
};

const Habit = mongoose.models.Habit || mongoose.model('Habit', habitSchema);

export default Habit; 