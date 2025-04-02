import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import { mailer } from '../config/mailer.js';
import crypto from 'crypto';

const router = express.Router();

// Generar código de verificación
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Función para generar hash de contraseña
const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return { salt, hash };
};

// Función para verificar contraseña
const verifyPassword = (password, hash, salt) => {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
};

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validar campos requeridos
    if (!email || !password || !username) {
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'El email o nombre de usuario ya está en uso' 
      });
    }

    // Generar salt y hash de la contraseña
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    // Crear nuevo usuario
    const user = new User({
      email,
      username,
      password: hash,
      salt,
      isVerified: true // Usuario verificado por defecto
    });

    await user.save();

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Enviar correo de bienvenida (sin esperar a que termine)
    mailer.sendWelcomeEmail(email, username).catch(error => {
      console.warn('No se pudo enviar el correo de bienvenida:', error);
    });

    // Responder inmediatamente sin esperar el envío del correo
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: true
      }
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error al registrar usuario' 
    });
  }
});

// Verificar código
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({ 
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Código inválido o expirado' 
      });
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    // Enviar correo de bienvenida
    await mailer.sendWelcomeEmail(user.email, user.username);

    res.json({ 
      message: 'Cuenta verificada exitosamente' 
    });

  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({ 
      message: 'Error al verificar código' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ 
        message: 'Credenciales incorrectas' 
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({ 
        message: 'Cuenta no verificada' 
      });
    }

    const isValidPassword = verifyPassword(password, user.password, user.salt);

    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Credenciales incorrectas' 
      });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Actualizar último login
    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error al iniciar sesión' 
    });
  }
});

// Solicitar restablecimiento de contraseña
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }

    // Generar token de restablecimiento
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();

    // Enviar correo
    await mailer.sendPasswordReset(email, resetToken);

    res.json({ 
      message: 'Correo de restablecimiento enviado' 
    });

  } catch (error) {
    console.error('Error en solicitud de restablecimiento:', error);
    res.status(500).json({ 
      message: 'Error al procesar la solicitud' 
    });
  }
});

// Restablecer contraseña
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        message: 'Token inválido o expirado' 
      });
    }

    // Actualizar contraseña
    const { salt, hash } = hashPassword(newPassword);
    user.password = hash;
    user.salt = salt;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ 
      message: 'Contraseña actualizada exitosamente' 
    });

  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ 
      message: 'Error al restablecer contraseña' 
    });
  }
});

// Verificar token (útil para el frontend)
router.get('/verify-token', authenticateToken, (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// Cerrar sesión (opcional, principalmente para el frontend)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Aquí podrías implementar una lista negra de tokens si lo deseas
    res.json({ 
      message: 'Sesión cerrada exitosamente' 
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ 
      message: 'Error al cerrar sesión' 
    });
  }
});

export default router;
