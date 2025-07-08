import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import crypto from 'crypto';
import mailer from '../config/mailer.js';
import rateLimit from 'express-rate-limit';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = express.Router();

// Rate limiters mejorados
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: 'Demasiados intentos de inicio de sesión. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 registros por hora
  message: 'Demasiados intentos de registro. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 intentos
  message: 'Demasiados intentos de recuperación de contraseña. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

// Esquemas de validación mejorados
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Por favor ingresa un email válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 8 caracteres',
      'any.required': 'La contraseña es requerida'
    }),
  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-z0-9_]+$/)
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.min': 'El nombre de usuario debe tener al menos 3 caracteres',
      'string.max': 'El nombre de usuario debe tener máximo 20 caracteres',
      'string.pattern.base': 'El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos',
      'any.required': 'El nombre de usuario es requerido'
    }),
  name: Joi.string()
    .min(2)
    .max(50)
    .trim()
    .optional()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre debe tener máximo 50 caracteres'
    })
});

const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Por favor ingresa un email válido',
      'any.required': 'El email es requerido'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'La contraseña es requerida'
    })
});

const passwordResetSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase()
    .messages({
      'string.email': 'Por favor ingresa un email válido',
      'any.required': 'El email es requerido'
    })
});

const verifyCodeSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase(),
  code: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required()
    .messages({
      'string.length': 'El código debe tener 6 dígitos',
      'string.pattern.base': 'El código debe contener solo números',
      'any.required': 'El código es requerido'
    })
});

const resetPasswordSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .trim()
    .lowercase(),
  code: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .required(),
  newPassword: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.min': 'La nueva contraseña debe tener al menos 8 caracteres',
      'any.required': 'La nueva contraseña es requerida'
    })
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.3.0'
  });
});

// Registro de usuario
router.post('/register', registerLimiter, async (req, res) => {
  try {
    console.log('📝 Iniciando registro de usuario...');
    
    // Validar datos de entrada
    const { error, value } = registerSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password, username, name } = value;

    // Verificar si el usuario ya existe con timeout
    console.log('🔍 Verificando usuario existente...');
    const existingUserPromise = User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { username: username.toLowerCase() }
      ] 
    }).maxTimeMS(5000);

    const existingUser = await existingUserPromise;

    if (existingUser) {
      console.log('⚠️ Usuario ya existe');
      return res.status(400).json({ 
        message: 'El email o nombre de usuario ya está en uso' 
      });
    }

    // Generar salt y hash
    console.log('🔐 Generando hash de contraseña...');
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    // Crear nuevo usuario
    console.log('👤 Creando nuevo usuario...');
    const userData = {
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password: hash,
      salt,
      preferences: {
        theme: 'light',
        notifications: true,
        language: 'es'
      },
      stats: {
        tasksCompleted: 0,
        habitsStreak: 0,
        totalSessions: 0,
        lastActive: new Date()
      },
      subscription: {
        status: 'free',
        trialStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000) // 21 días
      },
      ...(name && name.trim() ? { name: name.trim() } : {})
    };

    const user = new User(userData);

    // Guardar usuario con timeout
    console.log('💾 Guardando usuario en la base de datos...');
    const savePromise = user.save();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout al guardar usuario')), 10000);
    });

    await Promise.race([savePromise, timeoutPromise]);

    // Enviar correo de bienvenida
    try {
      await mailer.sendWelcomeEmail(email, username);
    } catch (e) {
      console.error('No se pudo enviar el correo de bienvenida:', e);
    }

    // Generar tokens
    console.log('🎟️ Generando tokens...');
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('✅ Usuario registrado exitosamente');

    // Responder
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      accessToken,
      refreshToken,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('❌ Error en registro:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    // Manejar errores específicos
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(500).json({
        message: 'Error de conexión con la base de datos',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Error de validación',
        errors: Object.values(error.errors).map(err => err.message)
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        message: 'El email o nombre de usuario ya está en uso'
      });
    }

    res.status(500).json({ 
      message: 'Error al registrar usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('🔐 Recibida petición de login');
    
    // Validar datos de entrada
    const { error, value } = loginSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, password } = value;

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user || !user.comparePassword(password)) {
      return res.status(401).json({ 
        message: 'Credenciales incorrectas' 
      });
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      return res.status(403).json({
        message: 'Tu cuenta ha sido desactivada. Contacta al soporte.'
      });
    }

    // Generar tokens
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Actualizar último login y actividad
    user.lastLogin = new Date();
    user.stats.lastActive = new Date();
    user.stats.totalSessions += 1;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error al iniciar sesión' 
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token es requerido' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Usuario no encontrado o inactivo' });
    }

    const newAccessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      accessToken: newAccessToken,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error en refresh token:', error);
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
});

// Ruta para recuperar contraseña
router.post('/recover-password', passwordResetLimiter, async (req, res) => {
    try {
        const { error, value } = passwordResetSchema.validate(req.body, { stripUnknown: true });
        if (error) {
            return res.status(400).json({
                message: 'Datos inválidos',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { email } = value;

        // Verificar si el usuario existe
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({ 
                message: 'No existe una cuenta con este correo electrónico' 
            });
        }

        // Verificar si ya hay un código activo
        if (user.resetPasswordCode && user.resetPasswordExpires > Date.now()) {
            return res.status(400).json({
                message: 'Ya existe un código de recuperación activo. Por favor, espere a que expire.'
            });
        }

        // Generar código de verificación
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        
        // Guardar el código en el usuario
        user.resetPasswordCode = verificationCode;
        user.resetPasswordExpires = Date.now() + 600000; // 10 minutos
        await user.save();

        // Enviar correo con el código
        await mailer.sendVerificationCode(email, verificationCode);

        res.json({ 
            message: 'Se ha enviado un código de verificación a tu correo',
            expiresIn: 600 // 10 minutos en segundos
        });

    } catch (error) {
        console.error('Error en recuperación de contraseña:', error);
        res.status(500).json({ 
            message: 'Error al procesar la solicitud' 
        });
    }
});

router.post('/verify-code', passwordResetLimiter, async (req, res) => {
  try {
    const { error, value } = verifyCodeSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, code } = value;

    console.log('Verificando código para:', email, 'Código recibido:', code);

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(404).json({ message: 'No existe una cuenta con este correo electrónico' });
    }

    console.log('Código guardado:', user.resetPasswordCode);
    console.log('Expira en:', new Date(user.resetPasswordExpires), 'Ahora:', new Date());

    if (
      !user.resetPasswordCode ||
      !user.resetPasswordExpires ||
      user.resetPasswordCode !== code ||
      user.resetPasswordExpires < Date.now()
    ) {
      console.log('Código inválido o expirado');
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    res.json({ 
      message: 'Código verificado correctamente',
      expiresIn: Math.floor((user.resetPasswordExpires - Date.now()) / 1000)
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ message: 'Error al verificar el código' });
  }
});

router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { email, code, newPassword } = value;

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con este correo electrónico' });
    }

    // Verificar código y expiración
    if (
      !user.resetPasswordCode ||
      !user.resetPasswordExpires ||
      user.resetPasswordCode !== code ||
      user.resetPasswordExpires < Date.now()
    ) {
      return res.status(400).json({ message: 'Código inválido o expirado' });
    }

    // Hashear la nueva contraseña
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(newPassword, salt, 1000, 64, 'sha512').toString('hex');
    
    // Actualizar usuario
    user.password = hash;
    user.salt = salt;
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.lastPasswordChange = new Date();
    await user.save();

    res.json({ message: 'Contraseña restablecida correctamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ message: 'Error al restablecer la contraseña' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // En una implementación más robusta, aquí se invalidaría el refresh token
    // Por ahora, solo respondemos con éxito
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ message: 'Error al cerrar sesión' });
  }
});

export default router;
