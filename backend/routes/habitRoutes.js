import express from 'express';
import Habit from '../models/Habit.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Middleware para validar ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de hábito inválido' });
  }
  next();
};

// Esquemas de validación
const notificationSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  time: Joi.date().required(),
  days: Joi.array().items(Joi.number().min(0).max(6)).default([0,1,2,3,4,5,6]),
  message: Joi.string().max(200)
});

const habitSchema = Joi.object({
  title: Joi.string().required().max(100).trim(),
  description: Joi.string().max(500).trim(),
  icon: Joi.string().required().valid(
    'exercise', 'meditation', 'reading', 'water', 
    'sleep', 'study', 'diet', 'coding', 'workout',
    'yoga', 'journal', 'music', 'art', 'language'
  ),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
  reminder: notificationSchema,
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  category: Joi.string().max(50).trim(),
  tags: Joi.array().items(Joi.string().max(30).trim()),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i),
  goal: Joi.object({
    target: Joi.number().min(1),
    unit: Joi.string().max(20),
    period: Joi.string().valid('day', 'week', 'month')
  })
});

// Obtener todos los hábitos del usuario con filtros
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      frequency, 
      priority, 
      search, 
      overdue,
      category,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

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

    // Filtrar por categoría
    if (category) {
      query.category = category;
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

    // Validar y procesar parámetros de paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Validar y procesar parámetros de ordenamiento
    const sortOptions = ['createdAt', '-createdAt', 'priority', '-priority', 'title', '-title'];
    const sortField = sortOptions.includes(sort) ? sort : '-createdAt';

    const [habits, total] = await Promise.all([
      Habit.find(query)
        .sort(sortField)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Habit.countDocuments(query)
    ]);

    // Calcular estadísticas adicionales
    const stats = await Habit.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalHabits: { $sum: 1 },
          activeHabits: {
            $sum: { $cond: [{ $eq: ['$status.archived', false] }, 1, 0] }
          },
          completedToday: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$status.archived', false] },
                    { $in: [new Date().toISOString().split('T')[0], '$progress.completedDates'] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        habits,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum
        },
        stats: stats[0] || {
          totalHabits: 0,
          activeHabits: 0,
          completedToday: 0
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener hábitos:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener los hábitos', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        errors: error.details.map(detail => detail.message)
      });
    }

    const habit = new Habit({
      ...value,
      userId: req.user._id,
      status: {
        archived: false,
        isOverdue: false
      },
      progress: {
        streak: 0,
        completedDates: [],
        weeklyProgress: [],
        monthlyProgress: []
      },
      reminder: {
        ...value.reminder,
        lastNotified: null
      }
    });

    await habit.save();
    res.status(201).json({ 
      success: true, 
      data: habit,
      message: 'Hábito creado exitosamente'
    });
  } catch (error) {
    console.error('Error al crear hábito:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al crear el hábito', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar hábito
router.put('/:id', validateObjectId, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = habitSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos', 
        errors: error.details.map(detail => detail.message)
      });
    }

    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 
        ...value,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!habit) {
      return res.status(404).json({ 
        success: false,
        message: 'Hábito no encontrado' 
      });
    }

    res.json({ 
      success: true, 
      data: habit,
      message: 'Hábito actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar hábito:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar el hábito', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar hábito
router.delete('/:id', validateObjectId, async (req, res) => {
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
      message: 'Hábito eliminado correctamente',
      data: { id: habit._id }
    });
  } catch (error) {
    console.error('Error al eliminar hábito:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al eliminar el hábito', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar hábito como completado/no completado
router.patch('/:id/toggle', validateObjectId, async (req, res) => {
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
    res.json({ 
      success: true, 
      data: habit,
      message: 'Estado del hábito actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar estado del hábito:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar el hábito', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const stats = await Habit.getStats(req.user._id, period);
    
    res.json({ 
      success: true,
      data: stats[0] || {
        totalHabits: 0,
        activeHabits: 0,
        totalCompletions: 0,
        averageStreak: 0,
        bestStreak: 0,
        overdueHabits: 0,
        completionRate: 0
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener estadísticas', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener progreso semanal
router.get('/weekly-progress', async (req, res) => {
  try {
    const { week, year } = req.query;
    
    if (!week || !year) {
      return res.status(400).json({
        success: false,
        message: 'Semana y año son requeridos'
      });
    }

    const weekNum = parseInt(week);
    const yearNum = parseInt(year);

    if (isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
      return res.status(400).json({
        success: false,
        message: 'Número de semana inválido'
      });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Año inválido'
      });
    }

    const habits = await Habit.find({
      userId: req.user._id,
      'progress.weeklyProgress': {
        $elemMatch: { week: weekNum, year: yearNum }
      }
    });

    const weeklyProgress = habits.map(habit => ({
      habitId: habit._id,
      title: habit.title,
      icon: habit.icon,
      completedDays: habit.progress.weeklyProgress.find(
        wp => wp.week === weekNum && wp.year === yearNum
      )?.completedDays || 0,
      streak: habit.progress.streak,
      goal: habit.goal
    }));

    res.json({ 
      success: true, 
      data: {
        week: weekNum,
        year: yearNum,
        habits: weeklyProgress,
        totalCompleted: weeklyProgress.reduce((sum, h) => sum + h.completedDays, 0)
      }
    });
  } catch (error) {
    console.error('Error al obtener progreso semanal:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener progreso semanal', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener progreso mensual
router.get('/monthly-progress', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Mes y año son requeridos'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Número de mes inválido'
      });
    }

    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Año inválido'
      });
    }

    const habits = await Habit.find({
      userId: req.user._id,
      'progress.monthlyProgress': {
        $elemMatch: { month: monthNum, year: yearNum }
      }
    });

    const monthlyProgress = habits.map(habit => ({
      habitId: habit._id,
      title: habit.title,
      icon: habit.icon,
      completedDays: habit.progress.monthlyProgress.find(
        mp => mp.month === monthNum && mp.year === yearNum
      )?.completedDays || 0,
      streak: habit.progress.streak,
      goal: habit.goal
    }));

    res.json({ 
      success: true, 
      data: {
        month: monthNum,
        year: yearNum,
        habits: monthlyProgress,
        totalCompleted: monthlyProgress.reduce((sum, h) => sum + h.completedDays, 0)
      }
    });
  } catch (error) {
    console.error('Error al obtener progreso mensual:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error al obtener progreso mensual', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar recordatorio
router.patch('/:id/reminder', validateObjectId, async (req, res) => {
  try {
    const { error, value } = notificationSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        success: false,
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

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

    habit.reminder = {
      ...habit.reminder,
      ...value,
      lastNotified: null
    };

    await habit.save();
    res.json({ 
      success: true, 
      data: habit,
      message: 'Recordatorio actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar recordatorio:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar el recordatorio', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router; 