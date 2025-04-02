import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

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

export default router;