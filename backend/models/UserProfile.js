import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  timePatterns: {
    morningInteractions: {  // 6-12h
      frequency: { type: Number, default: 0 },
      averageMood: { type: String, default: 'neutral' }
    },
    afternoonInteractions: {  // 12-18h
      frequency: { type: Number, default: 0 },
      averageMood: { type: String, default: 'neutral' }
    },
    eveningInteractions: {  // 18-24h
      frequency: { type: Number, default: 0 },
      averageMood: { type: String, default: 'neutral' }
    },
    nightInteractions: {  // 0-6h
      frequency: { type: Number, default: 0 },
      averageMood: { type: String, default: 'neutral' }
    },
    lastActive: Date
  },
  emotionalPatterns: {
    predominantEmotions: [{
      emotion: String,
      frequency: Number,
      timePattern: {
        morning: Number,    // 6-12h
        afternoon: Number,  // 12-18h
        evening: Number,    // 18-24h
        night: Number      // 0-6h
      }
    }],
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
  }]
}, {
  timestamps: true
});

export default mongoose.model('UserProfile', userProfileSchema); 