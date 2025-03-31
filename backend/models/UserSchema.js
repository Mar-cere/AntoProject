import mongoose from 'mongoose';

/**
 * Esquema Mongoose para el modelo de Usuario
 * Define la estructura de datos y comportamiento para almacenamiento en MongoDB
 */
const UserSchema = new mongoose.Schema({
  // Identificación
  id: {
    type: String,
    unique: true,
    default: function() {
      // Usar Math.random y Date para generar IDs únicos
      const timestamp = new Date().getTime().toString(36);
      const randomStr = Math.random().toString(36).substring(2, 10);
      const emailHash = Math.abs(this.email.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0)).toString(36).substring(0, 6);
      return `user_${timestamp}_${randomStr}_${emailHash}`;
    }
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
    required: true,
    unique: true
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
  },
  customId: {
    type: String,
    required: true,
    unique: true
  }
});

// Método simple de hash para passwords
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Middleware pre-save para procesar datos antes de guardar
 */
UserSchema.pre('save', async function(next) {
  // Actualizar fecha de modificación
  this.updatedAt = new Date();
  
  // Si la contraseña fue modificada, hashearla
  if (this.isModified('password')) {
    try {
      this.password = await hashPassword(this.password);
    } catch (error) {
      return next(error);
    }
  }
  
  // Generar usernameHash si no existe
  if (!this.usernameHash) {
    const baseString = this.username || this.email || `user_${Math.random()}`;
    const timestamp = new Date().getTime().toString(36).substring(0, 4);
    this.usernameHash = this.generateHash(baseString + timestamp);
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
UserSchema.methods.verifyPassword = async function(candidatePassword) {
  try {
    const hashedPassword = await hashPassword(candidatePassword);
    return this.password === hashedPassword;
  } catch (error) {
    throw new Error('Error al verificar la contraseña');
  }
};

/**
 * Función de hash simple
 */
UserSchema.methods.generateHash = function(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).substring(0, 6);
};

/**
 * Genera un ID único para el usuario
 */
UserSchema.methods.generateUniqueId = function() {
  const timestamp = new Date().getTime().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 10);
  const hash = this.generateHash(timestamp + randomStr);
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

// Evitar la redefinición del modelo
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User; 