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

// Verificar si el modelo ya existe antes de definirlo
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
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
  customId: {
    type: String,
    required: true,
    unique: true
  },
  // ... otros campos que necesites
}, {
  timestamps: true
}));

export default User;