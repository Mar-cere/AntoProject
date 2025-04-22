import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    default: 'user'
  },
  metadata: {
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['text', 'error', 'system'],
      default: 'text'
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    context: {
      emotional: {
        mainEmotion: String,
        intensity: Number,
        secondary: [String]
      },
      contextual: {
        intent: String,
        topics: [String],
        urgent: Boolean
      },
      response: mongoose.Schema.Types.Mixed
    },
    error: String
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
messageSchema.index({ userId: 1, conversationId: 1 });
messageSchema.index({ 'metadata.timestamp': -1 });
messageSchema.index({ conversationId: 1, 'metadata.timestamp': -1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

export default Message;
