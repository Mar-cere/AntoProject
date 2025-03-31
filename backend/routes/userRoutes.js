import express from 'express';
import User from '../models/UserSchema.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Ruta para obtener datos del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('Buscando usuario con ID:', req.user.userId);
    const user = await User.findOne({ customId: req.user.userId });
    
    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.customId,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error al obtener datos del usuario' });
  }
});

// Otras rutas del backend aquí...

export default router;