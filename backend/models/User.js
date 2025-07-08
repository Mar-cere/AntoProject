/**
 * Modelo de Usuario
 * 
 * Esta clase define la estructura de datos de los usuarios en la aplicación.
 * Proporciona métodos para gestionar la información del usuario, la generación
 * de IDs únicos y la serialización/deserialización de datos.
 * 
 * @version 1.3.0
 * @author AntoApp Team
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex'),
    unique: true,
    index: true
  },
  name: {
    type: String,
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [50, 'El nombre debe tener máximo 50 caracteres'],
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || (v.length >= 2 && v.length <= 50);
      },
      message: props => `El nombre debe tener entre 2 y 50 caracteres`
    }
  },
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [20, 'El nombre de usuario debe tener máximo 20 caracteres'],
    match: [/^[a-z0-9_]+$/, 'El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos'],
    index: true
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo válido'],
    index: true
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [8, 'La contraseña debe tener al menos 8 caracteres']
  },
  salt: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      enum: ['es', 'en'],
      default: 'es'
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'private'
      }
    }
  },
  stats: {
    tasksCompleted: {
      type: Number,
      default: 0,
      min: [0, 'Las tareas completadas no pueden ser negativas']
    },
    habitsStreak: {
      type: Number,
      default: 0,
      min: [0, 'La racha de hábitos no puede ser negativa']
    },
    totalSessions: {
      type: Number,
      default: 0,
      min: [0, 'El total de sesiones no puede ser negativo']
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  resetPasswordCode: {
    type: String,
    select: false // No se incluye en consultas por defecto
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  avatar: { 
    type: String, 
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || v.startsWith('http');
      },
      message: 'El avatar debe ser una URL válida'
    }
  },
  notificationPreferences: {
    enabled: {
      type: Boolean,
      default: true
    },
    morning: {
      enabled: { type: Boolean, default: true },
      hour: { 
        type: Number, 
        default: 8,
        min: [0, 'La hora debe estar entre 0 y 23'],
        max: [23, 'La hora debe estar entre 0 y 23']
      },
      minute: { 
        type: Number, 
        default: 0,
        min: [0, 'El minuto debe estar entre 0 y 59'],
        max: [59, 'El minuto debe estar entre 0 y 59']
      }
    },
    evening: {
      enabled: { type: Boolean, default: true },
      hour: { 
        type: Number, 
        default: 19,
        min: [0, 'La hora debe estar entre 0 y 23'],
        max: [23, 'La hora debe estar entre 0 y 23']
      },
      minute: { 
        type: Number, 
        default: 0,
        min: [0, 'El minuto debe estar entre 0 y 59'],
        max: [59, 'El minuto debe estar entre 0 y 59']
      }
    },
    types: {
      dailyReminders: { type: Boolean, default: true },
      habitReminders: { type: Boolean, default: true },
      taskReminders: { type: Boolean, default: true },
      motivationalMessages: { type: Boolean, default: true }
    }
  },
  subscription: {
    status: {
      type: String,
      enum: ['free', 'trial', 'premium', 'expired'],
      default: 'free'
    },
    trialStartDate: Date,
    trialEndDate: Date,
    subscriptionStartDate: Date,
    subscriptionEndDate: Date,
    plan: {
      type: String,
      enum: ['monthly', 'yearly'],
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ 'stats.lastActive': -1 });
userSchema.index({ createdAt: -1 });

// Virtual para calcular días desde el registro
userSchema.virtual('daysSinceRegistration').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual para verificar si el usuario está en período de prueba
userSchema.virtual('isInTrial').get(function() {
  if (!this.subscription.trialStartDate || !this.subscription.trialEndDate) {
    return false;
  }
  const now = new Date();
  return now >= this.subscription.trialStartDate && now <= this.subscription.trialEndDate;
});

// Virtual para verificar si la suscripción está activa
userSchema.virtual('hasActiveSubscription').get(function() {
  if (this.subscription.status === 'premium' && this.subscription.subscriptionEndDate) {
    return new Date() <= this.subscription.subscriptionEndDate;
  }
  return false;
});

// Método para comparar contraseña
userSchema.methods.comparePassword = function(candidatePassword) {
  const hash = crypto.pbkdf2Sync(candidatePassword, this.salt, 1000, 64, 'sha512').toString('hex');
  return this.password === hash;
};

// Método para actualizar última actividad
userSchema.methods.updateLastActive = function() {
  this.stats.lastActive = new Date();
  this.stats.totalSessions += 1;
  return this.save();
};

// Método para incrementar tareas completadas
userSchema.methods.incrementTasksCompleted = function() {
  this.stats.tasksCompleted += 1;
  return this.save();
};

// Método para actualizar racha de hábitos
userSchema.methods.updateHabitsStreak = function(streak) {
  this.stats.habitsStreak = Math.max(this.stats.habitsStreak, streak);
  return this.save();
};

// Middleware pre-save para asegurar que el id existe
userSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = crypto.randomBytes(16).toString('hex');
  }
  
  // Actualizar lastPasswordChange si la contraseña cambió
  if (this.isModified('password')) {
    this.lastPasswordChange = new Date();
  }
  
  next();
});

// Método para sanitizar el usuario antes de enviarlo
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj.password;
  delete obj.salt;
  delete obj.__v;
  delete obj.resetPasswordCode;
  delete obj.resetPasswordExpires;
  return obj;
};

// Método estático para buscar usuarios activos
userSchema.statics.findActiveUsers = function() {
  return this.find({ isActive: true });
};

// Método estático para buscar por email (case insensitive)
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

const User = mongoose.model('User', userSchema);

export default User;