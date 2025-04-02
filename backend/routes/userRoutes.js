import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mailer from '../config/mailer.js';

const router = express.Router();

// Ruta para obtener datos del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('Token recibido:', req.headers.authorization);
    console.log('ID de usuario:', req.user.id);
    
    const user = await User.findOne({ id: req.user.id });
    console.log('Usuario encontrado:', user);
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: error.message });
  }
});

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
      verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
      verificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000) // 10 minutos
    });

    await user.save();

    // Enviar correo de verificación si está configurado el mailer
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      try {
        await mailer.sendVerificationCode(email, user.verificationCode);
      } catch (emailError) {
        console.warn('No se pudo enviar el correo de verificación:', emailError);
      }
    }

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error al registrar usuario' 
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Recibida petición de login');
    const { email, password } = req.body;

    // Validar campos requeridos
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email y contraseña son requeridos'
      });
    }

    // Buscar usuario
    const user = await User.findOne({ email });
    console.log('Usuario encontrado:', user ? 'Sí' : 'No');

    if (!user) {
      return res.status(401).json({
        message: 'Credenciales incorrectas'
      });
    }

    // Verificar si la cuenta está verificada
    if (!user.isVerified) {
      return res.status(401).json({
        message: 'Cuenta no verificada'
      });
    }

    // Verificar contraseña
    const isValidPassword = user.comparePassword(password);
    console.log('Contraseña válida:', isValidPassword ? 'Sí' : 'No');

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

    // Enviar respuesta
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      message: 'Error al iniciar sesión'
    });
  }
});

// Actualizar perfil del usuario
router.put('/me', authenticateToken, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['name', 'username', 'email', 'preferences'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Actualizaciones inválidas' });
  }

  try {
    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Otras rutas del backend aquí...

export default router;