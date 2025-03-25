import express from 'express';
import Task from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todas las tareas del usuario
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
      .sort({ dueDate: 1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las tareas', error: error.message });
  }
});

// Crear una nueva tarea
router.post('/', async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      userId: req.user._id
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la tarea', error: error.message });
  }
});

// Actualizar una tarea
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar la tarea', error: error.message });
  }
});

// Eliminar una tarea
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la tarea', error: error.message });
  }
});

// Marcar tarea como completada
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    await task.markAsCompleted();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error al completar la tarea', error: error.message });
  }
});

// Obtener estadísticas de tareas
router.get('/stats', async (req, res) => {
  try {
    const stats = await Task.getStats(req.user._id);
    res.json(stats[0] || { total: 0, completed: 0, overdue: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
});

// Obtener tareas pendientes
router.get('/pending', async (req, res) => {
  try {
    const tasks = await Task.getPendingTasks(req.user._id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tareas pendientes', error: error.message });
  }
});

// Obtener tareas por categoría
router.get('/category/:category', async (req, res) => {
  try {
    const tasks = await Task.getTasksByCategory(req.user._id, req.params.category);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tareas por categoría', error: error.message });
  }
});

// Obtener tareas por prioridad
router.get('/priority/:priority', async (req, res) => {
  try {
    const tasks = await Task.getTasksByPriority(req.user._id, req.params.priority);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tareas por prioridad', error: error.message });
  }
});

// Obtener tareas para hoy
router.get('/today', async (req, res) => {
  try {
    const tasks = await Task.getTodayTasks(req.user._id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tareas de hoy', error: error.message });
  }
});

// Actualizar recordatorio
router.patch('/:id/reminder', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    task.reminder = {
      active: req.body.active,
      date: req.body.date
    };
    
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el recordatorio', error: error.message });
  }
});

export default router;