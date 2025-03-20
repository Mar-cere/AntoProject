import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Esquema Mongoose para el modelo de Usuario
 * Define la estructura de datos y comportamiento para almacenamiento en MongoDB
 */
const UserSchema = new mongoose.Schema({
  // Identificación
  id: {
    type: String,
    required: true,
    unique: true
  },
  
  // Información básica
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String
  },
  firstName: String,
  lastName: String,
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  usernameHash: String,
  avatar: String,
  
  // Autenticación y seguridad
  password: {
    type: String,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  
  // Preferencias
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
});

/**
 * Middleware pre-save para procesar datos antes de guardar
 */
UserSchema.pre('save', async function(next) {
  // Actualizar fecha de modificación
  this.updatedAt = new Date();
  
  // Si la contraseña fue modificada, hashearla
  if (this.isModified('password')) {
    try {
      this.password = await bcrypt.hash(this.password, 10);
    } catch (error) {
      return next(error);
    }
  }
  
  // Generar usernameHash si no existe
  if (!this.usernameHash) {
    const baseString = this.username || this.email || `user_${Math.random()}`;
    const salt = new Date().getTime().toString(36).substring(0, 4);
    this.usernameHash = this.hashCode(baseString + salt);
  }
  
  // Generar ID único si no existe
  if (!this.id) {
    this.id = this.generateUniqueId();
  }
  
  next();
});

/**
 * Método para verificar contraseña
 */
UserSchema.methods.verifyPassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    throw new Error('Error al verificar contraseña');
  }
};

/**
 * Función de hash para IDs
 */
UserSchema.methods.hashCode = function(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a entero de 32 bits
  }
  return Math.abs(hash).toString(36).substring(0, 6);
};

/**
 * Genera un ID único para el usuario
 */
UserSchema.methods.generateUniqueId = function() {
  const timestamp = new Date().getTime().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  const hash = this.hashCode(timestamp + randomStr);
  return `user_${timestamp}_${randomStr}_${hash}`;
};

/**
 * Método para obtener datos públicos del usuario
 */
UserSchema.methods.getPublicProfile = function() {
  const publicData = {
    id: this.id,
    name: this.name,
    username: this.username,
    avatar: this.avatar,
    usernameHash: this.usernameHash
  };
  
  return publicData;
};

/**
 * Método para actualizar datos del usuario
 */
UserSchema.methods.updateProfile = function(newData) {
  const allowedUpdates = ['name', 'firstName', 'lastName', 'avatar', 'preferences'];
  
  Object.keys(newData).forEach(update => {
    if (allowedUpdates.includes(update)) {
      this[update] = newData[update];
    }
  });
  
  this.updatedAt = new Date();
  return this;
};

/**
 * Crea y exporta el modelo Mongoose
 */
const User = mongoose.model('User', UserSchema);
export default User; 