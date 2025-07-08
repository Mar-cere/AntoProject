import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import cloudinary from 'cloudinary';
import Joi from 'joi';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiters
const updateProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 actualizaciones
  message: 'Demasiadas actualizaciones de perfil. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 cambios de avatar
  message: 'Demasiados cambios de avatar. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Esquemas de validación mejorados
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .optional()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre debe tener máximo 50 caracteres'
    }),
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-z0-9_]+$/)
    .trim()
    .lowercase()
    .optional()
    .messages({
      'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
      'string.max': 'El nombre de usuario debe tener máximo 20 caracteres',
      'string.pattern.base': 'El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos'
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .trim()
    .lowercase()
    .optional()
    .messages({
      'string.email': 'Por favor ingresa un email válido'
    }),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto'),
    notifications: Joi.boolean(),
    language: Joi.string().valid('es', 'en'),
    privacy: Joi.object({
      profileVisibility: Joi.string().valid('public', 'private', 'friends')
    })
  }).optional(),
  notificationPreferences: Joi.object({
    enabled: Joi.boolean(),
    morning: Joi.object({
      enabled: Joi.boolean(),
      hour: Joi.number().min(0).max(23),
      minute: Joi.number().min(0).max(59)
    }),
    evening: Joi.object({
      enabled: Joi.boolean(),
      hour: Joi.number().min(0).max(23),
      minute: Joi.number().min(0).max(59)
    }),
    types: Joi.object({
      dailyReminders: Joi.boolean(),
      habitReminders: Joi.boolean(),
      taskReminders: Joi.boolean(),
      motivationalMessages: Joi.boolean()
    })
  }).optional(),
  avatar: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'El avatar debe ser una URL válida'
    })
});

const updatePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'La contraseña actual es requerida'
  }),
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'any.required': 'La nueva contraseña es requerida'
    })
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
    const user = await User.findById(req.user._id)
      .select('-password -salt -__v -resetPasswordCode -resetPasswordExpires')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Tu cuenta ha sido desactivada' });
    }

    // Calcular tiempo desde último login
    const lastLogin = user.lastLogin ? new Date(user.lastLogin) : null;
    const timeSinceLastLogin = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 1000) : null;

    // Calcular días desde el registro
    const daysSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      ...user,
      timeSinceLastLogin,
      daysSinceRegistration
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ 
      message: 'Error al obtener datos del usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener estadísticas del usuario
router.get('/me/stats', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('stats subscription createdAt')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const daysSinceRegistration = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    // Calcular estadísticas adicionales
    const stats = {
      ...user.stats,
      daysSinceRegistration,
      averageTasksPerDay: daysSinceRegistration > 0 ? (user.stats.tasksCompleted / daysSinceRegistration).toFixed(2) : 0,
      subscriptionStatus: user.subscription.status,
      isInTrial: user.subscription.trialStartDate && user.subscription.trialEndDate && 
                new Date() >= user.subscription.trialStartDate && new Date() <= user.subscription.trialEndDate
    };

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar perfil del usuario
router.put('/me', authenticateToken, validateObjectId, updateProfileLimiter, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = updateProfileSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Tu cuenta ha sido desactivada' });
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
      } else if (key === 'notificationPreferences') {
        user.notificationPreferences = {
          ...user.notificationPreferences,
          ...value.notificationPreferences
        };
      } else {
        user[key] = value[key];
      }
    });

    // Actualizar timestamp
    user.updatedAt = new Date();
    await user.save();

    // Devolver usuario actualizado sin datos sensibles
    const updatedUser = user.toJSON();

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

// Cambiar contraseña
router.put('/me/password', authenticateToken, validateObjectId, updateProfileLimiter, async (req, res) => {
  try {
    const { error, value } = updatePasswordSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { currentPassword, newPassword } = value;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    if (!user.comparePassword(currentPassword)) {
      return res.status(400).json({ message: 'La contraseña actual es incorrecta' });
    }

    // Verificar que la nueva contraseña sea diferente
    if (user.comparePassword(newPassword)) {
      return res.status(400).json({ message: 'La nueva contraseña debe ser diferente a la actual' });
    }

    // Hashear nueva contraseña
    const crypto = require('crypto');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    user.password = hash;
    user.salt = salt;
    user.lastPasswordChange = new Date();
    await user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ 
      message: 'Error al cambiar la contraseña',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener URL firmada para avatar
router.get('/avatar-url/:publicId', authenticateToken, avatarLimiter, async (req, res) => {
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
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Soft delete
    user.isActive = false;
    user.email = `${user.email}_deleted_${Date.now()}`;
    user.username = `${user.username}_deleted_${Date.now()}`;
    user.deletedAt = new Date();
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

// Obtener información de suscripción
router.get('/me/subscription', authenticateToken, validateObjectId, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('subscription')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const subscription = user.subscription;
    
    // Calcular días restantes de prueba
    let trialDaysLeft = 0;
    if (subscription.trialStartDate && subscription.trialEndDate) {
      const now = new Date();
      const trialEnd = new Date(subscription.trialEndDate);
      if (now < trialEnd) {
        trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      }
    }

    // Calcular días restantes de suscripción
    let subscriptionDaysLeft = 0;
    if (subscription.subscriptionEndDate) {
      const now = new Date();
      const subEnd = new Date(subscription.subscriptionEndDate);
      if (now < subEnd) {
        subscriptionDaysLeft = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
      }
    }

    res.json({
      ...subscription,
      trialDaysLeft,
      subscriptionDaysLeft
    });
  } catch (error) {
    console.error('Error al obtener información de suscripción:', error);
    res.status(500).json({ 
      message: 'Error al obtener información de suscripción',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;