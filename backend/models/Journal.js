/**
 * Modelo de Journal (Diario)
 * 
 * Esta clase define la estructura de datos de las entradas del diario en la aplicación.
 * Proporciona métodos para gestionar las entradas del diario, incluyendo la creación,
 * actualización y recuperación de entradas, así como la gestión de estados de ánimo.
 * 
 * @version 1.0.0
 * @author AntoApp Team
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const journalSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex'),
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El ID del usuario es requerido']
  },
  content: {
    type: String,
    required: [true, 'El contenido de la entrada es requerido'],
    trim: true,
    minlength: [1, 'La entrada debe tener al menos 1 caracter'],
    maxlength: [2000, 'La entrada debe tener máximo 2000 caracteres']
  },
  mood: {
    type: String,
    required: [true, 'El estado de ánimo es requerido'],
    enum: ['happy', 'neutral', 'sad', 'excited', 'tired'],
    default: 'neutral'
  },
  tags: {
    type: [String],
    validate: [arr => arr.length <= 10, 'No puedes tener más de 10 etiquetas'],
    trim: true,
    maxlength: [20, 'Las etiquetas deben tener máximo 20 caracteres']
  },
  images: [{
    url: {
      type: String,
      trim: true
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [100, 'La descripción de la imagen debe tener máximo 100 caracteres']
    }
  }],
  metadata: {
    location: {
      type: String,
      trim: true,
      default: null
    },
    weather: {
      type: String,
      trim: true,
      default: null
    },
    activity: {
      type: String,
      trim: true,
      default: null
    }
  },
  privacy: {
    type: String,
    enum: ['private', 'shared'],
    default: 'private'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
journalSchema.index({ userId: 1, createdAt: -1 });
journalSchema.index({ mood: 1 });
journalSchema.index({ tags: 1 });

// Middleware pre-save para asegurar que el id existe
journalSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Método para sanitizar la entrada antes de enviarla
journalSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.isDeleted;
  return obj;
};

// Método para obtener el resumen de estados de ánimo por período
journalSchema.statics.getMoodSummary = async function(userId, startDate, endDate) {
  return await this.aggregate([
    {
      $match: {
        userId: userId,
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$mood',
        count: { $sum: 1 }
      }
    }
  ]);
};

// Método para obtener entradas por etiquetas
journalSchema.statics.getEntriesByTags = async function(userId, tags) {
  return await this.find({
    userId: userId,
    tags: { $in: tags },
    isDeleted: false
  }).sort({ createdAt: -1 });
};

// Método para marcar una entrada como eliminada (soft delete)
journalSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  await this.save();
  return true;
};

journalSchema.pre(/^find/, function(next) {
  this.where({ isDeleted: false });
  next();
});

const Journal = mongoose.model('Journal', journalSchema);

export default Journal;
