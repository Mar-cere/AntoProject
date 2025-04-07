import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { ACHIEVEMENTS } from '../config/achievements.js';

const router = express.Router();

// Middleware de autenticación
router.use(authenticateToken);

// Obtener todos los logros con su estado
router.get('/', async (req, res) => {
  try {
    const userAchievements = req.user.achievements;
    
    // Mapear todos los logros con su estado
    const achievements = Object.values(ACHIEVEMENTS).map(achievement => ({
      ...achievement,
      unlocked: userAchievements.some(a => a.id === achievement.id),
      unlockedAt: userAchievements.find(a => a.id === achievement.id)?.unlockedAt
    }));

    res.json({
      achievements,
      totalPoints: req.user.totalPoints
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener logros' });
  }
});

export default router;
