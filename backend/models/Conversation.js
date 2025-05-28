import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  title: {
    type: String,
    trim: true,
    default: 'Nueva conversación'
  }
}, {
  timestamps: true
});

// Middleware para validar que el creador esté en participants
conversationSchema.pre('validate', function(next) {
  if (
    !Array.isArray(this.participants) ||
    this.participants.length === 0 ||
    !this.participants.map(id => id.toString()).includes(this.userId.toString())
  ) {
    this.invalidate('participants', 'La conversación debe tener al menos un participante (el creador)');
  }
  next();
});

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema);

export default Conversation;
