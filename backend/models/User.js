/**
 * Modelo de Usuario
 * 
 * Esta clase define la estructura de datos de los usuarios en la aplicación.
 * Proporciona métodos para gestionar la información del usuario, la generación
 * de IDs únicos y la serialización/deserialización de datos.
 * 
 * @version 1.2.0
 * @author AntoApp Team
 */
import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex'),
    unique: true
  },
  name: {
    type: String,
    trim: true,
    minlength: [3, 'El nombre completo debe tener al menos 3 caracteres'],
    maxlength: [50, 'El nombre completo debe tener máximo 50 caracteres'],
    default: null,
    validate: {
      validator: function(v) {
        return v === null || v === undefined || v.length >= 3;
      },
      message: props => `El nombre completo debe tener al menos 3 caracteres`
    }
  },
  username: {
    type: String,
    required: [true, 'El nombre de usuario es requerido'],
    unique: true,
    trim: true,
    minlength: [3, 'El nombre de usuario debe tener al menos 3 caracteres'],
    maxlength: [20, 'El nombre de usuario debe tener máximo 20 caracteres']
  },
  email: {
    type: String,
    required: [true, 'El correo electrónico es requerido'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor ingresa un correo válido']
  },
  password: {
    type: String,
    required: [true, 'La contraseña es requerida']
  },
  salt: {
    type: String,
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  stats: {
    tasksCompleted: {
      type: Number,
      default: 0
    },
    habitsStreak: {
      type: Number,
      default: 0
    },
    lastActive: {
      type: Date,
      default: Date.now
    }
  },
  resetPasswordCode: String,
  resetPasswordExpires: Date,
  avatar: { type: String, default: null },
  notificationPreferences: {
    morning: {
      hour: { type: Number, default: 8 },
      minute: { type: Number, default: 0 }
    },
    evening: {
      hour: { type: Number, default: 19 },
      minute: { type: Number, default: 0 }
    }
  },
}, {
  timestamps: true
});

// Método para comparar contraseña
userSchema.methods.comparePassword = function(candidatePassword) {
  const hash = crypto.pbkdf2Sync(candidatePassword, this.salt, 1000, 64, 'sha512').toString('hex');
  return this.password === hash;
};

// Middleware pre-save para asegurar que el id existe
userSchema.pre('save', function(next) {
  if (!this.id) {
    this.id = crypto.randomBytes(16).toString('hex');
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

const User = mongoose.model('User', userSchema);

export default User;