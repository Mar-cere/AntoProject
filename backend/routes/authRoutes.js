import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import crypto from 'crypto';

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

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
      salt
    });

    await user.save();

    // Generar token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Responder inmediatamente
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ 
      message: 'Error al registrar usuario' 
    });
  }
});

// Login
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

    if (!user || !user.comparePassword(password)) {
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
      user: user.toJSON()
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      message: 'Error al iniciar sesión' 
    });
  }
});

export default router;
