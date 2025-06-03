import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import cloudinary from 'cloudinary';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Esquemas de validación
const updateProfileSchema = Joi.object({
  name: Joi.string().max(100).trim(),
  username: Joi.string().min(3).max(30).trim(),
  email: Joi.string().email().trim().lowercase(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system'),
    notifications: Joi.boolean(),
    language: Joi.string().valid('es', 'en'),
    timezone: Joi.string()
  }),
  avatar: Joi.string()
});

// Middleware para validar ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.user._id)) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }
  next();
};

// Ruta para obtener datos del usuario actual
router.get('/me', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
      .select('-password -salt -__v -resetPasswordCode -resetPasswordExpires')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Calcular tiempo desde último login
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const timeSinceLastLogin = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 1000) : null;

    res.json({
      ...user,
      timeSinceLastLogin
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener datos del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar perfil del usuario
router.put('/me', authenticateToken, validateObjectId, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = updateProfileSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar unicidad de email y username si se están actualizando
    if (value.email && value.email !== user.email) {
      const existingEmail = await User.findOne({ email: value.email });
      if (existingEmail) {
        return res.status(400).json({ message: 'El email ya está en uso' });
      }
    }

    if (value.username && value.username !== user.username) {
      const existingUsername = await User.findOne({ username: value.username });
      if (existingUsername) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
    }

    // Actualizar campos
    Object.keys(value).forEach(key => {
      if (key === 'preferences') {
        user.preferences = {
          ...user.preferences,
          ...value.preferences
        };
      } else {
        user[key] = value[key];
      }
    });

    // Actualizar timestamp
    user.updatedAt = new Date();
    await user.save();

    // Devolver usuario actualizado sin datos sensibles
    const updatedUser = user.toObject();
    delete updatedUser.password;
    delete updatedUser.salt;
    delete updatedUser.resetPasswordCode;
    delete updatedUser.resetPasswordExpires;

    res.json({
      message: 'Perfil actualizado correctamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(400).json({ 
      message: 'Error al actualizar el perfil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener URL firmada para avatar
router.get('/avatar-url/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;

    // Validar que el publicId pertenece al usuario
    const user = await User.findOne({ 
      _id: req.user._id,
      avatar: { $regex: publicId }
    });

    if (!user) {
      return res.status(403).json({ 
        message: 'No tienes permiso para acceder a este avatar' 
      });
    }

    const url = cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5, // 5 minutos de validez
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    res.json({ 
      url,
      expiresIn: 300 // 5 minutos en segundos
    });
  } catch (err) {
    console.error('Error generando URL de avatar:', err);
    res.status(500).json({ 
      message: 'Error al generar URL del avatar',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Eliminar cuenta (soft delete)
router.delete('/me', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Soft delete
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.email = `${user.email}_deleted_${Date.now()}`;
    user.username = `${user.username}_deleted_${Date.now()}`;
    await user.save();

    res.json({ 
      message: 'Cuenta eliminada correctamente',
      deletedAt: user.deletedAt
    });
  } catch (error) {
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ 
      message: 'Error al eliminar la cuenta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;