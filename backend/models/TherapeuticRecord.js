import mongoose from 'mongoose';

const therapeuticRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  sessions: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    emotion: {
      type: String,
      default: 'neutral'
    },
    toolsUsed: [{
      type: String
    }],
    progress: {
      type: String,
      default: 'iniciando'
    }
  }],
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  currentStatus: {
    type: String,
    default: 'neutral'
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

export default mongoose.model('TherapeuticRecord', therapeuticRecordSchema);
