import mongoose from 'mongoose';

const habitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  icon: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly'],
    default: 'daily'
  },
  reminder: {
    type: Date,
    required: true
  },
  streak: {
    type: Number,
    default: 0
  },
  completedDays: {
    type: Number,
    default: 0
  },
  totalDays: {
    type: Number,
    default: 0
  },
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  next();
});

// Método para marcar como completado
habitSchema.methods.toggleComplete = async function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const lastCompleted = this.lastCompleted ? new Date(this.lastCompleted) : null;
  const wasCompletedToday = lastCompleted && 
    lastCompleted.getFullYear() === today.getFullYear() &&
    lastCompleted.getMonth() === today.getMonth() &&
    lastCompleted.getDate() === today.getDate();

  if (wasCompletedToday) {
    this.completedToday = false;
    this.lastCompleted = null;
    this.streak = Math.max(0, this.streak - 1);
    this.completedDays = Math.max(0, this.completedDays - 1);
  } else {
    this.completedToday = true;
    this.lastCompleted = now;
    this.streak += 1;
    this.completedDays += 1;
    this.totalDays += 1;
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
        activeHabits: { $sum: { $cond: [{ $eq: ['$archived', false] }, 1, 0] } },
        totalCompletions: { $sum: '$completedDays' },
        averageStreak: { $avg: '$streak' }
      }
    }
  ]);
};

const Habit = mongoose.models.Habit || mongoose.model('Habit', habitSchema);

export default Habit; 