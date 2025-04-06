import express from 'express';
import Habit from '../models/Habit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todos los hábitos del usuario con filtros
router.get('/', async (req, res) => {
  try {
    const { status, frequency, search } = req.query;
    const query = { userId: req.user._id };

    // Filtrar por estado (active/archived)
    if (status) {
      query['status.archived'] = status === 'archived';
    }

    // Filtrar por frecuencia
    if (frequency) {
      query.frequency = frequency;
    }

    // Búsqueda por título o descripción
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const habits = await Habit.find(query)
      .sort({ 'status.archived': 1, createdAt: -1 });
    
    res.json(habits);
  } catch (error) {
    console.error('Error al obtener hábitos:', error);
    res.status(500).json({ message: 'Error al obtener los hábitos', error: error.message });
  }
});

// Crear nuevo hábito
router.post('/', async (req, res) => {
  try {
    // Validar la hora del recordatorio
    const reminderTime = new Date(req.body.reminder);
    if (isNaN(reminderTime)) {
      return res.status(400).json({ message: 'Hora de recordatorio inválida' });
    }

    const habit = new Habit({
      ...req.body,
      userId: req.user._id,
      reminder: {
        time: reminderTime,
        enabled: true
      }
    });

    await habit.save();
    res.status(201).json(habit);
  } catch (error) {
    console.error('Error al crear hábito:', error);
    res.status(400).json({ 
      message: 'Error al crear el hábito', 
      error: error.message,
      validationErrors: error.errors 
    });
  }
});

// Actualizar hábito
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    
    // Manejar actualización de recordatorio
    if (updates.reminder) {
      const reminderTime = new Date(updates.reminder);
      if (isNaN(reminderTime)) {
        return res.status(400).json({ message: 'Hora de recordatorio inválida' });
      }
      updates.reminder = {
        time: reminderTime,
        enabled: true,
        lastNotified: null
      };
    }

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updates,
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }
    res.json(habit);
  } catch (error) {
    console.error('Error al actualizar hábito:', error);
    res.status(400).json({ 
      message: 'Error al actualizar el hábito', 
      error: error.message,
      validationErrors: error.errors 
    });
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
    console.error('Error al eliminar hábito:', error);
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

    if (habit.status.archived) {
      return res.status(400).json({ message: 'No se puede modificar un hábito archivado' });
    }

    await habit.toggleComplete();
    res.json(habit);
  } catch (error) {
    console.error('Error al actualizar estado del hábito:', error);
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

    habit.status.archived = !habit.status.archived;
    // Resetear el estado completado si se está desarchivando
    if (!habit.status.archived) {
      habit.status.completedToday = false;
      habit.status.lastCompleted = null;
    }

    await habit.save();
    res.json(habit);
  } catch (error) {
    console.error('Error al archivar hábito:', error);
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
      averageStreak: 0,
      bestStreak: 0
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
});

// Obtener progreso semanal
router.get('/weekly-progress', async (req, res) => {
  try {
    const { week, year } = req.query;
    const habits = await Habit.find({
      userId: req.user._id,
      'progress.weeklyProgress': {
        $elemMatch: { week: parseInt(week), year: parseInt(year) }
      }
    });

    const weeklyProgress = habits.map(habit => ({
      habitId: habit._id,
      title: habit.title,
      icon: habit.icon,
      completedDays: habit.progress.weeklyProgress.find(
        wp => wp.week === parseInt(week) && wp.year === parseInt(year)
      )?.completedDays || 0
    }));

    res.json(weeklyProgress);
  } catch (error) {
    console.error('Error al obtener progreso semanal:', error);
    res.status(500).json({ message: 'Error al obtener progreso semanal', error: error.message });
  }
});

// Actualizar recordatorio
router.patch('/:id/reminder', async (req, res) => {
  try {
    const { enabled, time } = req.body;
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ message: 'Hábito no encontrado' });
    }

    if (time) {
      const reminderTime = new Date(time);
      if (isNaN(reminderTime)) {
        return res.status(400).json({ message: 'Hora de recordatorio inválida' });
      }
      habit.reminder.time = reminderTime;
    }

    if (typeof enabled === 'boolean') {
      habit.reminder.enabled = enabled;
    }

    habit.reminder.lastNotified = null;
    await habit.save();
    res.json(habit);
  } catch (error) {
    console.error('Error al actualizar recordatorio:', error);
    res.status(400).json({ message: 'Error al actualizar el recordatorio', error: error.message });
  }
});

export default router; 