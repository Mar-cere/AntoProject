import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  metadata: {
    type: Object,  // Cambiado de String a Object
    default: () => ({
      timestamp: new Date(),
      type: 'text',
      status: 'sent'
    })
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  isSystemMessage: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }
}, {
  timestamps: true
});

// Índices para búsqueda eficiente
messageSchema.index({ 'metadata.topics': 1 });
messageSchema.index({ 'metadata.emotionalContext.mainEmotion': 1 });
messageSchema.index({ 'metadata.contextualMemory.relatedTopics': 1 });

// Índices para mejorar el rendimiento de las consultas
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ userId: 1, timestamp: -1 });

// Método para sanitizar el mensaje antes de enviarlo
messageSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

// Método para marcar como leído
messageSchema.methods.markAsRead = async function() {
  this.status = 'read';
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

export default Message;
