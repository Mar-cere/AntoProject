import mongoose from 'mongoose';

// Definir sub-esquemas para mejor control
const EmotionSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'neutral',
    required: true
  },
  intensity: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  }
}, { _id: false });

const SessionSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  emotion: {
    type: EmotionSchema,
    required: true,
    default: () => ({})
  },
  tools: [{
    type: String
  }],
  progress: {
    type: String,
    default: 'en_curso'
  }
}, { _id: false });

const CurrentStatusSchema = new mongoose.Schema({
  emotion: {
    type: String,
    default: 'neutral',
    required: true
  },
  lastUpdate: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { _id: false });

const therapeuticRecordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessions: {
    type: [SessionSchema],
    default: []
  },
  currentStatus: {
    type: CurrentStatusSchema,
    required: true,
    default: () => ({})
  },
  activeTools: {
    type: [String],
    default: []
  },
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

// Asegurar valores por defecto en la creación
therapeuticRecordSchema.pre('save', function(next) {
  if (!this.currentStatus) {
    this.currentStatus = {
      emotion: 'neutral',
      lastUpdate: new Date()
    };
  }
  next();
});

// Asegurar que las actualizaciones mantengan la estructura
therapeuticRecordSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  // Asegurar que currentStatus siempre tenga la estructura correcta
  if (update.$set && update.$set.currentStatus) {
    if (typeof update.$set.currentStatus === 'string') {
      update.$set.currentStatus = {
        emotion: update.$set.currentStatus,
        lastUpdate: new Date()
      };
    }
  }
  
  next();
});

let TherapeuticRecord;
try {
  TherapeuticRecord = mongoose.model('TherapeuticRecord');
} catch {
  TherapeuticRecord = mongoose.model('TherapeuticRecord', therapeuticRecordSchema);
}

export default TherapeuticRecord;
