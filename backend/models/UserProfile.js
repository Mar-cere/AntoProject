import mongoose from 'mongoose';

const EmotionTimePatternSchema = new mongoose.Schema({
  morning: { type: Number, default: 0 },
  afternoon: { type: Number, default: 0 },
  evening: { type: Number, default: 0 },
  night: { type: Number, default: 0 }
}, { _id: false });

const EmotionSchema = new mongoose.Schema({
  emotion: { type: String, required: true },
  frequency: { type: Number, default: 0 },
  timePattern: {
    type: EmotionTimePatternSchema,
    default: () => ({})
  }
}, { _id: false });

const TimeInteractionSchema = new mongoose.Schema({
  frequency: { type: Number, default: 0 },
  averageMood: { type: String, default: 'neutral' }
}, { _id: false });

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  timePatterns: {
    morningInteractions: { type: TimeInteractionSchema, default: () => ({}) },
    afternoonInteractions: { type: TimeInteractionSchema, default: () => ({}) },
    eveningInteractions: { type: TimeInteractionSchema, default: () => ({}) },
    nightInteractions: { type: TimeInteractionSchema, default: () => ({}) },
    lastActive: { type: Date, default: Date.now }
  },
  emotionalPatterns: {
    predominantEmotions: {
      type: [EmotionSchema],
      default: () => ([])
    },
    emotionalTriggers: [{
      trigger: String,
      emotion: String,
      frequency: Number
    }]
  },
  commonTopics: [{
    topic: String,
    frequency: Number,
    lastDiscussed: Date,
    associatedEmotions: [{
      emotion: String,
      intensity: Number
    }]
  }],
  copingStrategies: [{
    strategy: String,
    effectiveness: Number,  // 1-10
    usageCount: Number,
    lastUsed: Date
  }],
  preferences: {
    communicationStyle: {
      type: String,
      enum: ['directo', 'empático', 'analítico', 'motivacional'],
      default: 'empático'
    },
    responseLength: {
      type: String,
      enum: ['corto', 'medio', 'largo'],
      default: 'medio'
    },
    topics: {
      preferred: [String],
      avoided: [String]
    }
  },
  progressMetrics: {
    emotionalGrowth: {
      startDate: Date,
      checkpoints: [{
        date: Date,
        metrics: {
          emotionalAwareness: Number,  // 1-10
          copingSkills: Number,        // 1-10
          overallWellbeing: Number     // 1-10
        }
      }]
    }
  },
  lastInteractions: [{
    timestamp: Date,
    emotion: String,
    topic: String,
    responseEffectiveness: Number  // 1-10
  }],
  connectionStats: {
    lastConnection: { type: Date, default: Date.now },
    frequentTimes: {
      morning: { type: Number, default: 0 },    // 6-12h
      afternoon: { type: Number, default: 0 },  // 12-18h
      evening: { type: Number, default: 0 },    // 18-24h
      night: { type: Number, default: 0 }       // 0-6h
    },
    weekdayPatterns: {
      monday: { type: Number, default: 0 },
      tuesday: { type: Number, default: 0 },
      wednesday: { type: Number, default: 0 },
      thursday: { type: Number, default: 0 },
      friday: { type: Number, default: 0 },
      saturday: { type: Number, default: 0 },
      sunday: { type: Number, default: 0 }
    }
  }
}, {
  timestamps: true
});

// Middleware para asegurar que la estructura existe
userProfileSchema.pre('save', function(next) {
  if (!this.emotionalPatterns) {
    this.emotionalPatterns = { predominantEmotions: [] };
  }
  if (!this.timePatterns) {
    this.timePatterns = {
      morningInteractions: { frequency: 0, averageMood: 'neutral' },
      afternoonInteractions: { frequency: 0, averageMood: 'neutral' },
      eveningInteractions: { frequency: 0, averageMood: 'neutral' },
      nightInteractions: { frequency: 0, averageMood: 'neutral' },
      lastActive: new Date()
    };
  }
  if (!this.connectionStats) {
    this.connectionStats = {
      lastConnection: new Date(),
      frequentTimes: {
        morning: 0,
        afternoon: 0,
        evening: 0,
        night: 0
      },
      weekdayPatterns: {
        monday: 0,
        tuesday: 0,
        wednesday: 0,
        thursday: 0,
        friday: 0,
        saturday: 0,
        sunday: 0
      }
    };
  }
  next();
});

export default mongoose.model('UserProfile', userProfileSchema); 