import express from 'express';
import Habit from '../models/Habit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todos los hábitos del usuario
router.get('/', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(habits);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los hábitos', error: error.message });
  }
});

// Crear nuevo hábito
router.post('/', async (req, res) => {
  try {
    const habit = new Habit({
      ...req.body,
      userId: req.user._id
    });
    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el hábito', error: error.message });
  }
});

// Actualizar hábito
router.put('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el hábito', error: error.message });
  }
});

// Eliminar hábito
router.delete('/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }
    res.json({ message: 'Hábito eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el hábito', error: error.message });
  }
});

// Marcar hábito como completado/no completado
router.patch('/:id/toggle', async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }
    await habit.toggleComplete();
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el hábito', error: error.message });
  }
});

// Archivar/desarchivar hábito
router.patch('/:id/archive', async (req, res) => {
  try {
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }
    habit.archived = !habit.archived;
    await habit.save();
    res.json(habit);
  } catch (error) {
    res.status(400).json({ message: 'Error al archivar el hábito', error: error.message });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await Habit.getStats(req.user._id);
    res.json(stats[0] || {
      totalHabits: 0,
      activeHabits: 0,
      totalCompletions: 0,
      averageStreak: 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
});

export default router; 