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
    default: 'general',
    required: true
  },
  requirement: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(value) {
        return typeof value === 'number' || 
               (typeof value === 'object' && value !== null);
      },
      message: 'El requisito debe ser un número o un objeto de condiciones'
    }
  },
  requirementType: {
    type: String,
    enum: ['count', 'streak', 'duration', 'custom'],
    required: true,
    default: 'count'
  },
  progress: {
    type: Number,
    default: 0,
    min: 0
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
    required: true,
    min: 0,
    default: 0
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze'
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

// Método para verificar si un logro está disponible
achievementSchema.methods.isAvailable = function() {
  return !this.completed && this.progress < this.requirement;
};

// Método para calcular el porcentaje de progreso
achievementSchema.methods.getProgressPercentage = function() {
  if (typeof this.requirement === 'number') {
    return Math.min(100, (this.progress / this.requirement) * 100);
  }
  return this.progress;
};

// Método estático para obtener logros por categoría
achievementSchema.statics.getByCategory = async function(userId, category) {
  return this.find({
    userId,
    ...(category !== 'all' ? { category } : {})
  }).sort({ completed: 1, createdAt: -1 });
};

// Método estático mejorado para obtener estadísticas
achievementSchema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$completed', true] }, 1, 0] } },
        totalPoints: { $sum: { $cond: [{ $eq: ['$completed', true] }, '$points', 0] } },
        byCategory: {
          $push: {
            category: '$category',
            completed: '$completed'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        completed: 1,
        totalPoints: 1,
        categoryStats: {
          $reduce: {
            input: '$byCategory',
            initialValue: {},
            in: {
              $mergeObjects: [
                '$$value',
                {
                  $let: {
                    vars: {
                      cat: '$$this.category'
                    },
                    in: {
                      $object: {
                        k: '$$cat',
                        v: {
                          $cond: ['$$this.completed', 1, 0]
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    }
  ]);
};

const Achievement = mongoose.models.Achievement || mongoose.model('Achievement', achievementSchema);

export default Achievement; 