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
});

// Eliminar el modelo si existe para evitar errores de redefinición
let TherapeuticRecord;
try {
  TherapeuticRecord = mongoose.model('TherapeuticRecord');
} catch {
  TherapeuticRecord = mongoose.model('TherapeuticRecord', therapeuticRecordSchema);
}

export default TherapeuticRecord;
