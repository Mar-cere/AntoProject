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
    console.log('📝 Iniciando registro de usuario...');
    const { email, password, username, name } = req.body;

    // Log de datos recibidos
    console.log('📬 Datos recibidos:', {
      email,
      username,
      hasPassword: !!password,
      name: name ? name.trim() : null
    });

    // Validar campos requeridos
    if (!email || !password || !username) {
      console.log('❌ Campos faltantes');
      return res.status(400).json({ 
        message: 'Todos los campos son requeridos' 
      });
    }

    // Verificar si el usuario ya existe con timeout
    console.log('🔍 Verificando usuario existente...');
    const existingUserPromise = User.findOne({ 
      $or: [{ email }, { username }] 
    }).maxTimeMS(5000); // 5 segundos máximo para la búsqueda

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
      email,
      username,
      password: hash,
      salt,
      preferences: {
        theme: 'light',
        notifications: true
      },
      stats: {
        tasksCompleted: 0,
        habitsStreak: 0,
        lastActive: new Date()
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

    // Generar token
    console.log('🎟️ Generando token...');
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Usuario registrado exitosamente');

    // Responder
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
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
