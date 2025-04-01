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
  // Campos de identificación
  id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },

  // Campos de perfil
  name: {
    type: String,
    trim: true
  },
  avatar: {
    type: String
  },
  points: {
    type: Number,
    default: 0
  },

  // Campos de estado
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },

  // Preferencias de usuario
  preferences: {
    theme: {
      type: String,
      default: 'dark'
    },
    notifications: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'es'
    }
  }
}, {
  timestamps: true
});

// Método para hashear contraseña
userSchema.methods.hashPassword = function(password) {
  return crypto
    .createHash('sha256')
    .update(password)
    .digest('hex');
};

// Middleware para hashear la contraseña antes de guardar
userSchema.pre('save', function(next) {
  if (this.isModified('password')) {
    this.password = this.hashPassword(this.password);
  }
  next();
});

// Método para verificar contraseña
userSchema.methods.comparePassword = function(candidatePassword) {
  const hash = this.hashPassword(candidatePassword);
  return this.password === hash;
};

// Método para generar el ID único del usuario
userSchema.pre('save', function(next) {
  if (!this.id) {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 5);
    this.id = `user_${timestamp}${randomStr}`;
  }
  next();
});

// Método para limpiar datos sensibles al convertir a JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;