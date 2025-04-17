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
    timestamp: Date,
    topics: [String],         // Temas detectados en el mensaje
    emotionalContext: {
      mainEmotion: String,    // Emoción principal detectada
      intensity: Number,      // Intensidad de la emoción (1-10)
      valence: String         // Positiva, negativa, neutral
    },
    contextualMemory: {
      relatedTopics: [String],    // Temas relacionados de conversaciones anteriores
      previousReferences: [{       // Referencias a mensajes anteriores relevantes
        messageId: mongoose.Schema.Types.ObjectId,
        relevance: Number,        // Puntuación de relevancia (0-1)
        topic: String            // Tema relacionado
      }],
      userPreferences: {          // Preferencias detectadas del usuario
        communicationStyle: String,  // Directo, empático, técnico, etc.
        responseLength: String,      // Corto, medio, largo
        topicsOfInterest: [String]   // Temas que interesan al usuario
      }
    },
    type: String,              // Tipo de mensaje (text, error, suggestion, etc.)
    status: String            // Estado del mensaje (sent, read, etc.)
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
