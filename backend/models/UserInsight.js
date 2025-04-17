import mongoose from 'mongoose';

const userInsightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  interactions: [{
    timestamp: Date,
    patterns: Object,
    goals: Object,
    emotion: String,
    intensity: Number
  }],
  recurringPatterns: [String],
  activeGoals: [String],
  lastUpdate: Date
});

export default mongoose.model('UserInsight', userInsightSchema);
