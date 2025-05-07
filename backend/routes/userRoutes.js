import express from 'express';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';
import cloudinary from 'cloudinary';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ruta para obtener datos del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id }).select('-password -salt -__v');
    
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
  const allowedUpdates = ['name', 'username', 'email', 'preferences', 'avatar'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).json({ message: 'Actualizaciones inválidas' });
  }

  try {
    const user = await User.findOne({ id: req.user.id });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    updates.forEach(update => user[update] = req.body[update]);
    await user.save();
    res.json(user);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(400).json({ message: error.message });
  }
});

router.get('/avatar-url/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    // Opcional: verifica que el usuario tenga permiso para ver este avatar

    const url = cloudinary.url(publicId, {
      type: 'authenticated',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 5 // 5 minutos de validez
    });
    console.log('URL firmada generada:', url);
    res.json({ url });
  } catch (err) {
    console.error('Error generando URL de avatar:', err);
    res.status(500).json({ error: 'Error generando URL de avatar' });
  }
});

export default router;