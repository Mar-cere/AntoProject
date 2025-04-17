import mongoose from 'mongoose';

const userGoalsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  goals: [{
    type: String,
    description: String,
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 1
    },
    milestones: [{
      date: Date,
      description: String,
      emotionalState: String
    }],
    status: {
      type: String,
      enum: ['active', 'completed', 'paused'],
      default: 'active'
    }
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('UserGoals', userGoalsSchema); 