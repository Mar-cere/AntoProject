import mongoose from 'mongoose';

const therapeuticRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sessions: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    emotion: {
      name: {
        type: String,
        default: 'neutral'
      },
      intensity: {
        type: Number,
        default: 5,
        min: 1,
        max: 10
      }
    },
    tools: [{
      type: String
    }],
    progress: {
      type: String,
      default: 'en_curso'
    }
  }],
  currentStatus: {
    emotion: {
      type: String,
      default: 'neutral'
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  activeTools: [{
    type: String
  }],
  progressMetrics: {
    emotionalStability: {
      type: Number,
      default: 5,
      min: 1,
      max: 10
    },
    toolMastery: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    engagementLevel: {
      type: Number,
      default: 5,
      min: 1,
      max: 10
    }
  },
  therapeuticGoals: [{
    description: String,
    status: {
      type: String,
      enum: ['pendiente', 'en_progreso', 'logrado'],
      default: 'pendiente'
    },
    dateCreated: {
      type: Date,
      default: Date.now
    },
    dateAchieved: Date
  }]
}, {
  timestamps: true,
  strict: true
});

// Middleware para asegurar la estructura correcta antes de guardar
therapeuticRecordSchema.pre('save', function(next) {
  if (!this.currentStatus || typeof this.currentStatus === 'string') {
    this.currentStatus = {
      emotion: 'neutral',
      lastUpdate: new Date()
    };
  }
  next();
});

// Middleware para asegurar la estructura correcta antes de actualizar
therapeuticRecordSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.$set && typeof update.$set.currentStatus === 'string') {
    update.$set.currentStatus = {
      emotion: update.$set.currentStatus,
      lastUpdate: new Date()
    };
  }
  next();
});

let TherapeuticRecord;
try {
  TherapeuticRecord = mongoose.model('TherapeuticRecord');
} catch (error) {
  TherapeuticRecord = mongoose.model('TherapeuticRecord', therapeuticRecordSchema);
}

export default TherapeuticRecord;
