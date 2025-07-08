/**
 * Rutas de Tareas y Recordatorios
 * 
 * Este módulo maneja todas las operaciones CRUD para tareas y recordatorios,
 * incluyendo gestión de subtareas, notificaciones y estadísticas.
 * 
 * @version 1.3.0
 * @author AntoApp Team
 */
import express from 'express';
import Task from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiters
const createTaskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // 20 tareas por 15 minutos
  message: 'Demasiadas tareas creadas. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

const updateTaskLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 actualizaciones por 15 minutos
  message: 'Demasiadas actualizaciones. Por favor, intente más tarde.',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// --- Esquemas de validación con Joi ---
const subtaskSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El título de la subtarea es requerido',
      'string.min': 'El título de la subtarea debe tener al menos 1 carácter',
      'string.max': 'El título de la subtarea debe tener máximo 100 caracteres',
      'any.required': 'El título de la subtarea es requerido'
    })
});

const notificationSchema = Joi.object({
  enabled: Joi.boolean().default(true),
  reminderTime: Joi.date().when('enabled', {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  repeatReminder: Joi.boolean().default(false),
  reminderInterval: Joi.number()
    .min(5)
    .max(1440)
    .default(30)
    .messages({
      'number.min': 'El intervalo mínimo es 5 minutos',
      'number.max': 'El intervalo máximo es 24 horas'
    })
});

const repeatSchema = Joi.object({
  type: Joi.string()
    .valid('none', 'daily', 'weekly', 'monthly', 'yearly', 'custom')
    .default('none'),
  interval: Joi.number()
    .min(1)
    .default(1)
    .messages({
      'number.min': 'El intervalo debe ser al menos 1'
    }),
  endDate: Joi.date().optional(),
  daysOfWeek: Joi.array().items(
    Joi.number().min(0).max(6)
  ).optional()
});

const taskSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'El título es requerido',
      'string.min': 'El título debe tener al menos 1 carácter',
      'string.max': 'El título debe tener máximo 100 caracteres',
      'any.required': 'El título es requerido'
    }),
  description: Joi.string()
    .max(500)
    .allow('', null)
    .default('')
    .messages({
      'string.max': 'La descripción debe tener máximo 500 caracteres'
    }),
  dueDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.min': 'La fecha de vencimiento no puede ser anterior a hoy',
      'any.required': 'La fecha de vencimiento es requerida'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high', 'urgent')
    .default('medium'),
  status: Joi.string()
    .valid('pending', 'in_progress', 'completed', 'cancelled')
    .default('pending'),
  itemType: Joi.string()
    .valid('task', 'reminder', 'goal')
    .default('task'),
  category: Joi.string()
    .max(50)
    .default('General')
    .messages({
      'string.max': 'La categoría debe tener máximo 50 caracteres'
    }),
  tags: Joi.array()
    .items(Joi.string().max(20).messages({
      'string.max': 'Cada etiqueta debe tener máximo 20 caracteres'
    }))
    .default([]),
  estimatedTime: Joi.number()
    .min(0)
    .max(1440)
    .optional()
    .messages({
      'number.min': 'El tiempo estimado no puede ser negativo',
      'number.max': 'El tiempo estimado máximo es 24 horas'
    }),
  actualTime: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.min': 'El tiempo real no puede ser negativo'
    }),
  progress: Joi.number()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.min': 'El progreso no puede ser negativo',
      'number.max': 'El progreso no puede exceder 100%'
    }),
  subtasks: Joi.array()
    .items(subtaskSchema)
    .default([]),
  parentTask: Joi.string()
    .custom((value, helpers) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    }, 'ID de tarea padre inválido')
    .optional(),
  notifications: notificationSchema.default({}),
  repeat: repeatSchema.default({})
});

const updateTaskSchema = taskSchema.fork(
  ['title', 'dueDate'], 
  field => field.optional()
);

// Middleware para validar ObjectId
const validateObjectId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID de tarea inválido' });
  }
  next();
};

// Obtener todas las tareas y recordatorios del usuario con filtros y paginación
router.get('/', async (req, res) => {
  try {
    const {
      type,
      status,
      priority,
      category,
      overdue,
      page = 1,
      limit = 20,
      sort = 'dueDate',
      order = 'asc'
    } = req.query;

    const options = {
      category: category || undefined,
      priority: priority || undefined
    };

    // Construir query base
    let query = { userId: req.user._id };
    
    if (type) {
      query.itemType = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['completed', 'cancelled'] };
    }

    // Configurar paginación
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;
    const sortObj = { [sort]: sortOrder };

    const tasks = await Task.getPendingItems(req.user._id, type, {
      ...options,
      sort: sortObj,
      limit: parseInt(limit),
      skip
    });

    // Contar total para paginación
    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener tareas:', error);
    res.status(500).json({ 
      message: 'Error al obtener las tareas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Crear una nueva tarea o recordatorio
router.post('/', createTaskLimiter, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = taskSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Preparar datos para el modelo
    const itemData = {
      ...value,
      userId: req.user._id,
      isReminder: value.itemType === 'reminder'
    };

    // Validaciones específicas por tipo
    if (itemData.itemType === 'reminder') {
      itemData.status = 'pending';
      delete itemData.priority; // Los recordatorios no tienen prioridad
    }

    // Validar tarea padre si se proporciona
    if (itemData.parentTask) {
      const parentTask = await Task.findOne({
        _id: itemData.parentTask,
        userId: req.user._id
      });
      if (!parentTask) {
        return res.status(400).json({ message: 'Tarea padre no encontrada' });
      }
    }

    const task = new Task(itemData);
    await task.save();

    res.status(201).json({ 
      success: true, 
      message: 'Tarea creada exitosamente',
      data: task 
    });
  } catch (error) {
    console.error('Error al crear tarea:', error);
    res.status(400).json({ 
      message: 'Error al crear la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener una tarea específica
router.get('/:id', validateObjectId, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('parentTask', 'title status');

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    console.error('Error al obtener tarea:', error);
    res.status(500).json({ 
      message: 'Error al obtener la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Actualizar una tarea o recordatorio
router.put('/:id', validateObjectId, updateTaskLimiter, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = updateTaskSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ 
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    // No permitir cambiar tipo ni usuario
    delete value.itemType;
    delete value.userId;

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Actualizar campos
    Object.keys(value).forEach(key => {
      if (key === 'notifications') {
        task.notifications = {
          ...task.notifications,
          ...value.notifications
        };
      } else if (key === 'repeat') {
        task.repeat = {
          ...task.repeat,
          ...value.repeat
        };
      } else {
        task[key] = value[key];
      }
    });

    await task.save();

    res.json({ 
      success: true, 
      message: 'Tarea actualizada exitosamente',
      data: task 
    });
  } catch (error) {
    console.error('Error al actualizar tarea:', error);
    res.status(400).json({ 
      message: 'Error al actualizar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar una tarea o recordatorio (soft delete)
router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    await task.softDelete();
    
    res.json({ 
      success: true,
      message: 'Tarea eliminada correctamente' 
    });
  } catch (error) {
    console.error('Error al eliminar tarea:', error);
    res.status(500).json({ 
      message: 'Error al eliminar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar tarea como completada
router.patch('/:id/complete', validateObjectId, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    await task.markAsCompleted();
    
    res.json({ 
      success: true, 
      message: 'Tarea marcada como completada',
      data: task 
    });
  } catch (error) {
    console.error('Error al completar tarea:', error);
    res.status(400).json({ 
      message: error.message || 'Error al completar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Marcar tarea como en progreso
router.patch('/:id/in-progress', validateObjectId, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    await task.markAsInProgress();
    
    res.json({ 
      success: true, 
      message: 'Tarea marcada como en progreso',
      data: task 
    });
  } catch (error) {
    console.error('Error al marcar tarea en progreso:', error);
    res.status(400).json({ 
      message: error.message || 'Error al marcar la tarea en progreso',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancelar tarea
router.patch('/:id/cancel', validateObjectId, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    await task.cancel();
    
    res.json({ 
      success: true, 
      message: 'Tarea cancelada',
      data: task 
    });
  } catch (error) {
    console.error('Error al cancelar tarea:', error);
    res.status(400).json({ 
      message: 'Error al cancelar la tarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Agregar subtarea
router.post('/:id/subtasks', validateObjectId, async (req, res) => {
  try {
    const { title } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'El título de la subtarea es requerido' });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    await task.addSubtask(title.trim());
    
    res.json({ 
      success: true, 
      message: 'Subtarea agregada exitosamente',
      data: task 
    });
  } catch (error) {
    console.error('Error al agregar subtarea:', error);
    res.status(400).json({ 
      message: 'Error al agregar la subtarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Completar subtarea
router.patch('/:id/subtasks/:subtaskIndex/complete', validateObjectId, async (req, res) => {
  try {
    const subtaskIndex = parseInt(req.params.subtaskIndex);
    
    if (isNaN(subtaskIndex) || subtaskIndex < 0) {
      return res.status(400).json({ message: 'Índice de subtarea inválido' });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    await task.completeSubtask(subtaskIndex);
    
    res.json({ 
      success: true, 
      message: 'Subtarea completada exitosamente',
      data: task 
    });
  } catch (error) {
    console.error('Error al completar subtarea:', error);
    res.status(400).json({ 
      message: error.message || 'Error al completar la subtarea',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener tareas vencidas
router.get('/overdue', async (req, res) => {
  try {
    const tasks = await Task.getOverdueItems(req.user._id);
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error al obtener tareas vencidas:', error);
    res.status(500).json({ 
      message: 'Error al obtener las tareas vencidas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener recordatorios próximos
router.get('/reminders/upcoming', async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const reminders = await Task.getUpcomingReminders(req.user._id, parseInt(hours));
    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Error al obtener recordatorios próximos:', error);
    res.status(500).json({ 
      message: 'Error al obtener los recordatorios próximos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await Task.getStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ 
      message: 'Error al obtener estadísticas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener items por fecha
router.get('/date/:date', async (req, res) => {
  try {
    const { type } = req.query;
    const date = new Date(req.params.date);
    
    if (isNaN(date.getTime())) {
      return res.status(400).json({ message: 'Fecha inválida' });
    }
    
    const items = await Task.getItemsByDate(req.user._id, date, type);
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Error al obtener items por fecha:', error);
    res.status(500).json({ 
      message: 'Error al obtener items por fecha',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Buscar tareas por texto
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const tasks = await Task.find({
      userId: req.user._id,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      deletedAt: { $exists: false }
    })
    .sort({ dueDate: 1 })
    .limit(parseInt(limit))
    .skip(skip);
    
    const total = await Task.countDocuments({
      userId: req.user._id,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ],
      deletedAt: { $exists: false }
    });
    
    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al buscar tareas:', error);
    res.status(500).json({ 
      message: 'Error al buscar tareas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;