import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  conversationId: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed'],
    default: 'sent'
  },
  type: {
    type: String,
    enum: ['text', 'system', 'error'],
    default: 'text'
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
