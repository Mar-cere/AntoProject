import express from 'express';
import Task from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// --- Esquema de validación con Joi ---
const notificationSchema = Joi.object({
  enabled: Joi.boolean(),
  time: Joi.date()
});

const taskSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(''),
  dueDate: Joi.date().required(),
  priority: Joi.string().valid('low', 'medium', 'high'),
  itemType: Joi.string().valid('task', 'reminder'),
  repeat: Joi.string().valid('none', 'daily', 'weekly', 'monthly'),
  notifications: Joi.array().items(notificationSchema),
  completed: Joi.boolean()
});

// Obtener todas las tareas y recordatorios del usuario
router.get('/', async (req, res) => {
  try {
    const { type } = req.query; // Opcional: filtrar por tipo (task/reminder)
    const query = { userId: req.user._id };
    
    if (type) {
      query.itemType = type;
    }
    
    const tasks = await Task.find(query).sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los items', error: error.message });
  }
});

// Crear una nueva tarea o recordatorio
router.post('/', async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = taskSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: 'Datos inválidos', error: error.details[0].message });
    }

    // Preparar datos para el modelo
    const itemData = {
      ...value,
      userId: req.user._id,
      isReminder: value.itemType === 'reminder'
    };

    if (itemData.itemType === 'reminder') {
      itemData.completed = false;
      itemData.priority = undefined;
    }

    const task = new Task(itemData);
    await task.save();

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la tarea/recordatorio', error: error.message });
  }
});

// Actualizar una tarea o recordatorio
router.put('/:id', async (req, res) => {
  try {
    // Validar datos de entrada (no requerimos todos los campos)
    const { error, value } = taskSchema.fork(['title', 'dueDate'], field => field.optional()).validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({ message: 'Datos inválidos', error: error.details[0].message });
    }

    // No permitir cambiar tipo ni usuario
    delete value.itemType;
    delete value.userId;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      value,
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Item no encontrado' });
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar', error: error.message });
  }
});

// Eliminar una tarea o recordatorio
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    res.json({ message: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar', error: error.message });
  }
});

// Marcar item como completado (tanto tareas como recordatorios)
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    
    // Marcar como completado independientemente del tipo
    task.completed = true;
    task.completedAt = new Date();
    await task.save();
    
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(400).json({ message: 'Error al completar el item', error: error.message });
  }
});

// Obtener items pendientes (tareas no completadas y recordatorios futuros)
router.get('/pending', async (req, res) => {
  try {
    const query = {
      userId: req.user._id,
      $or: [
        { itemType: 'reminder' },
        { itemType: 'task', completed: false }
      ]
    };

    const tasks = await Task.find(query).sort({ dueDate: 1 });
    
    // Agregar campo isOverdue a cada tarea
    const tasksWithOverdue = tasks.map(task => {
      const taskObj = task.toObject();
      taskObj.isOverdue = !task.completed && new Date(task.dueDate) < new Date();
      return taskObj;
    });

    res.json({ success: true, data: tasksWithOverdue });
  } catch (error) {
    console.error('Error al obtener items pendientes:', error);
    res.status(500).json({ message: 'Error al obtener los items pendientes' });
  }
});

// Obtener estadísticas
router.get('/stats', async (req, res) => {
  try {
    const stats = await Task.getStats(req.user._id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
});

// Obtener items por fecha
router.get('/date/:date', async (req, res) => {
  try {
    const { type } = req.query;
    const items = await Task.getItemsByDate(req.user._id, new Date(req.params.date), type);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener items por fecha', error: error.message });
  }
});

export default router;