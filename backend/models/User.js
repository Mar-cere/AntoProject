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

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  name: String,
  points: {
    type: Number,
    default: 0
  },
  avatar: String,
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: Date,
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

// Eliminar customId de todas las respuestas
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.customId; // Por si existe en documentos antiguos
  delete user.password;
  return user;
};

// Verificar si el modelo ya existe antes de definirlo
const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;