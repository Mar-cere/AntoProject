import express from 'express';
import User from '../models/UserSchema.js';
import { authenticateToken } from '../middleware/auth.js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
    const { username, email, password } = req.body;
    
    // Generar customId
    const customId = `user_${nanoid()}`;
    
    const user = new User({
      customId,
      username,
      email: email.toLowerCase(),
      password
    });

    await user.save();

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: {
        id: user.customId,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error al registrar usuario' });
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Recibida petición de login');
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('Usuario no encontrado:', email);
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Contraseña inválida para:', email);
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Generar token
    const token = jwt.sign(
      { userId: user.customId, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login exitoso para:', email);
    
    res.json({
      token,
      user: {
        id: user.customId,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
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