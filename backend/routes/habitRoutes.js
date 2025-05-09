import express from 'express';
import Habit from '../models/Habit.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Esquema de validación
const habitSchema = Joi.object({
  title: Joi.string().required().max(100),
  description: Joi.string().max(500),
  icon: Joi.string().required().valid(
    'exercise', 'meditation', 'reading', 'water', 
    'sleep', 'study', 'diet', 'coding', 'workout',
    'yoga', 'journal', 'music', 'art', 'language'
  ),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly'),
  reminder: Joi.object({
    time: Joi.date().required(),
    enabled: Joi.boolean(),
    notifications: Joi.array().items(
      Joi.object({
        enabled: Joi.boolean(),
        time: Joi.date(),
        sent: Joi.boolean()
      })
    )
  }),
  priority: Joi.string().valid('low', 'medium', 'high')
});

// Obtener todos los hábitos del usuario con filtros
router.get('/', async (req, res) => {
  try {
    const { status, frequency, priority, search, overdue } = req.query;
    const query = { userId: req.user._id };

    // Filtrar por estado (active/archived)
    if (status) {
      query['status.archived'] = status === 'archived';
    }

    // Filtrar por frecuencia
    if (frequency) {
      query.frequency = frequency;
    }

    // Filtrar por prioridad
    if (priority) {
      query.priority = priority;
    }

    // Filtrar por vencidos
    if (overdue === 'true') {
      query['status.isOverdue'] = true;
    }

    // Búsqueda por título o descripción
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const habits = await Habit.find(query)
      .sort({ 
        'status.archived': 1,
        'status.isOverdue': -1,
        priority: -1,
        createdAt: -1 
      });
    
    res.json({ success: true, data: habits });
  } catch (error) {
    console.error('Error al obtener hábitos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener los hábitos', 
      error: error.message 
    });
  }
});

// Crear nuevo hábito
router.post('/', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = habitSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos', 
        error: error.details[0].message 
      });
    }

    const habit = new Habit({
      ...value,
      userId: req.user._id,
      reminder: {
        ...value.reminder,
        lastNotified: null
      }
    });

    await habit.save();
    res.status(201).json({ success: true, data: habit });
  } catch (error) {
    console.error('Error al crear hábito:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al crear el hábito', 
      error: error.message,
      validationErrors: error.errors 
    });
  }
});

// Actualizar hábito
router.put('/:id', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = habitSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos', 
        error: error.details[0].message 
      });
    }

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...value, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Hábito no encontrado' 
      });
    }
    res.json({ success: true, data: habit });
  } catch (error) {
    console.error('Error al actualizar hábito:', error);
    res.status(400).json({ 
      success: false,
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
      return res.status(404).json({ 
        success: false,
        message: 'Hábito no encontrado' 
      });
    }
    res.json({ 
      success: true,
      message: 'Hábito eliminado correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar hábito:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al eliminar el hábito', 
      error: error.message 
    });
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
      return res.status(404).json({ 
        success: false,
        message: 'Hábito no encontrado' 
      });
    }

    if (habit.status.archived) {
      return res.status(400).json({ 
        success: false,
        message: 'No se puede modificar un hábito archivado' 
      });
    }

    await habit.toggleComplete();
    res.json({ success: true, data: habit });
  } catch (error) {
    console.error('Error al actualizar estado del hábito:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar el hábito', 
      error: error.message 
    });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await Habit.getStats(req.user._id);
    res.json({ 
      success: true,
      data: stats[0] || {
        totalHabits: 0,
        activeHabits: 0,
        totalCompletions: 0,
        averageStreak: 0,
        bestStreak: 0,
        overdueHabits: 0
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener estadísticas', 
      error: error.message 
    });
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
      )?.completedDays || 0,
      streak: habit.progress.streak
    }));

    res.json({ success: true, data: weeklyProgress });
  } catch (error) {
    console.error('Error al obtener progreso semanal:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener progreso semanal', 
      error: error.message 
    });
  }
});

// Obtener progreso mensual
router.get('/monthly-progress', async (req, res) => {
  try {
    const { month, year } = req.query;
    const habits = await Habit.find({
      userId: req.user._id,
      'progress.monthlyProgress': {
        $elemMatch: { month: parseInt(month), year: parseInt(year) }
      }
    });

    const monthlyProgress = habits.map(habit => ({
      habitId: habit._id,
      title: habit.title,
      icon: habit.icon,
      completedDays: habit.progress.monthlyProgress.find(
        mp => mp.month === parseInt(month) && mp.year === parseInt(year)
      )?.completedDays || 0,
      streak: habit.progress.streak
    }));

    res.json({ success: true, data: monthlyProgress });
  } catch (error) {
    console.error('Error al obtener progreso mensual:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener progreso mensual', 
      error: error.message 
    });
  }
});

// Actualizar recordatorio
router.patch('/:id/reminder', async (req, res) => {
  try {
    const { enabled, time, notifications } = req.body;
    const habit = await Habit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Hábito no encontrado' 
      });
    }

    if (time) {
      const reminderTime = new Date(time);
      if (isNaN(reminderTime)) {
        return res.status(400).json({ 
          success: false,
          message: 'Hora de recordatorio inválida' 
        });
      }
      habit.reminder.time = reminderTime;
    }

    if (typeof enabled === 'boolean') {
      habit.reminder.enabled = enabled;
    }

    if (notifications) {
      habit.reminder.notifications = notifications;
    }

    habit.reminder.lastNotified = null;
    await habit.save();
    res.json({ success: true, data: habit });
  } catch (error) {
    console.error('Error al actualizar recordatorio:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar el recordatorio', 
      error: error.message 
    });
  }
});

export default router; 