import mongoose from 'mongoose';
import crypto from 'crypto';

const habitSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex'),
    unique: true,
    index: true
  },
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
      values: [
        'exercise', 'meditation', 'reading', 'water', 
        'sleep', 'study', 'diet', 'coding', 'workout',
        'yoga', 'journal', 'music', 'art', 'language'
      ],
      message: 'Icono no válido'
    }
  },
  frequency: {
    type: String,
    enum: {
      values: ['daily', 'weekly', 'monthly'],
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
    },
    notifications: [{
      enabled: { type: Boolean, default: true },
      time: { type: Date },
      sent: { type: Boolean, default: false }
    }]
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
      completedDays: Number,
      streak: Number
    }],
    monthlyProgress: [{
      month: Number,
      year: Number,
      completedDays: Number,
      streak: Number
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
    },
    isOverdue: {
      type: Boolean,
      default: false
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
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
  },
  deletedAt: {
    type: Date,
    select: false
  }
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
    // Desmarcar como completado
    this.status.completedToday = false;
    this.status.lastCompleted = null;
    this.progress.streak = Math.max(0, this.progress.streak - 1);
    this.progress.completedDays = Math.max(0, this.progress.completedDays - 1);
  } else {
    // Marcar como completado
    this.status.completedToday = true;
    this.status.lastCompleted = now;
    this.status.isOverdue = false;
    this.progress.streak += 1;
    this.progress.completedDays += 1;
    this.progress.totalDays += 1;
    
    // Actualizar progreso semanal y mensual
    const currentWeek = this.getCurrentWeek();
    const currentMonth = this.getCurrentMonth();
    this.updateWeeklyProgress(currentWeek);
    this.updateMonthlyProgress(currentMonth);
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
        bestStreak: { $max: '$progress.bestStreak' },
        overdueHabits: { $sum: { $cond: [{ $eq: ['$status.isOverdue', true] }, 1, 0] } }
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

// Método para obtener el mes actual
habitSchema.methods.getCurrentMonth = function() {
  const now = new Date();
  return {
    month: now.getMonth(),
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
    weekProgress.streak = this.progress.streak;
  } else {
    this.progress.weeklyProgress.push({
      week: currentWeek.week,
      year: currentWeek.year,
      completedDays: 1,
      streak: this.progress.streak
    });
  }
};

// Método para actualizar el progreso mensual
habitSchema.methods.updateMonthlyProgress = function(currentMonth) {
  const monthProgress = this.progress.monthlyProgress.find(
    mp => mp.month === currentMonth.month && mp.year === currentMonth.year
  );

  if (monthProgress) {
    monthProgress.completedDays += 1;
    monthProgress.streak = this.progress.streak;
  } else {
    this.progress.monthlyProgress.push({
      month: currentMonth.month,
      year: currentMonth.year,
      completedDays: 1,
      streak: this.progress.streak
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

// Índices para mejorar rendimiento
habitSchema.index({ userId: 1, createdAt: -1 });
habitSchema.index({ userId: 1, status: 1 });
habitSchema.index({ userId: 1, priority: 1 });
habitSchema.index({ userId: 1, frequency: 1 });
habitSchema.index({ 'reminder.time': 1 });
habitSchema.index({ 'status.completedToday': 1 });
habitSchema.index({ 'status.archived': 1 });
habitSchema.index({ 'progress.streak': -1 });

// Virtuals útiles
habitSchema.virtual('isActive').get(function() {
  return !this.status.archived && !this.deletedAt;
});

habitSchema.virtual('completionRate').get(function() {
  if (this.progress.totalDays === 0) return 0;
  return Math.round((this.progress.completedDays / this.progress.totalDays) * 100);
});

habitSchema.virtual('daysSinceLastCompleted').get(function() {
  if (!this.status.lastCompleted) return null;
  const now = new Date();
  const lastCompleted = new Date(this.status.lastCompleted);
  const diffTime = now - lastCompleted;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Middleware pre-save mejorado
habitSchema.pre('save', function(next) {
  // Generar ID si no existe
  if (!this.id) {
    this.id = crypto.randomBytes(16).toString('hex');
  }
  
  this.updatedAt = new Date();
  
  // Actualizar bestStreak si el streak actual es mayor
  if (this.progress.streak > this.progress.bestStreak) {
    this.progress.bestStreak = this.progress.streak;
  }

  // Verificar si está vencido
  const now = new Date();
  const reminderTime = new Date(this.reminder.time);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const reminderToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 
                               reminderTime.getHours(), reminderTime.getMinutes());

  this.status.isOverdue = !this.status.completedToday && now > reminderToday;
  
  next();
});

// Método para soft delete
habitSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

// Método para restaurar
habitSchema.methods.restore = function() {
  this.deletedAt = undefined;
  return this.save();
};

// Método para archivar/desarchivar
habitSchema.methods.toggleArchive = function() {
  this.status.archived = !this.status.archived;
  return this.save();
};

// Método estático para obtener hábitos activos
habitSchema.statics.getActiveHabits = function(userId) {
  return this.find({
    userId,
    deletedAt: { $exists: false },
    'status.archived': false
  }).sort({ createdAt: -1 });
};

// Método estático para obtener hábitos vencidos
habitSchema.statics.getOverdueHabits = function(userId) {
  return this.find({
    userId,
    deletedAt: { $exists: false },
    'status.archived': false,
    'status.isOverdue': true
  }).sort({ 'reminder.time': 1 });
};

const Habit = mongoose.models.Habit || mongoose.model('Habit', habitSchema);

export default Habit; 