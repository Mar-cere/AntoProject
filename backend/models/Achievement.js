import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['tasks', 'habits', 'streaks', 'general'],
    default: 'general'
  },
  requirement: {
    type: Number,
    required: true,
    default: 1
  },
  progress: {
    type: Number,
    default: 0
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
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
  },
  reward: {
    type: String,
    default: null
  },
  points: {
    type: Number,
    default: 0
  }
});

// Middleware para actualizar updatedAt
achievementSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Método para actualizar progreso
achievementSchema.methods.updateProgress = async function(newProgress) {
  this.progress = Math.min(newProgress, this.requirement);
  
  if (this.progress >= this.requirement && !this.completed) {
    this.completed = true;
    this.completedAt = new Date();
  } else if (this.progress < this.requirement && this.completed) {
    this.completed = false;
    this.completedAt = null;
  }
  
  return this.save();
};

// Método para obtener estadísticas
achievementSchema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } },
        totalPoints: { $sum: { $cond: [{ $eq: ['$completed', true] }, '$points', 0] } }
      }
    }
  ]);
};

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);

export default Achievement; 