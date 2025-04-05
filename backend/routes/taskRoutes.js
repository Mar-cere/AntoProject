import express from 'express';
import Task from '../models/Task.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

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
    console.log('Datos recibidos:', req.body); // Para debug

    const itemData = {
      ...req.body,
      userId: req.user._id,
      itemType: req.body.itemType || 'task',
      isReminder: req.body.itemType === 'reminder'
    };

    // Si es un recordatorio, ajustamos algunos campos
    if (itemData.itemType === 'reminder') {
      itemData.completed = false;
      itemData.priority = undefined;
    }

    const task = new Task(itemData);
    await task.save();
    
    console.log('Item creado:', task); // Para debug
    res.status(201).json(task);
  } catch (error) {
    console.error('Error al crear:', error);
    res.status(400).json({ 
      message: `Error al crear el ${req.body.itemType === 'reminder' ? 'recordatorio' : 'tarea'}`,
      error: error.message 
    });
  }
});

// Actualizar una tarea o recordatorio
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // Asegurarnos de que no se pueda cambiar el tipo de item
    delete updateData.itemType;
    delete updateData.isReminder;

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      updateData,
      { new: true }
    );
    
    if (!task) {
      return res.status(404).json({ message: 'Item no encontrado' });
    }
    res.json(task);
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

// Marcar tarea como completada (solo para tareas, no recordatorios)
router.patch('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user._id
    });
    
    if (!task) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }
    
    if (task.itemType === 'reminder') {
      return res.status(400).json({ message: 'Los recordatorios no pueden marcarse como completados' });
    }
    
    await task.markAsCompleted();
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: 'Error al completar la tarea', error: error.message });
  }
});

// Obtener items pendientes (tareas no completadas y recordatorios futuros)
router.get('/pending', async (req, res) => {
  try {
    console.log('Usuario autenticado:', req.user); // Para debug

    const query = {
      userId: req.user._id,
      dueDate: { $gte: new Date() },
      $or: [
        { itemType: 'reminder' },
        { itemType: 'task', completed: false }
      ]
    };

    const tasks = await Task.find(query).sort({ dueDate: 1 });
    res.json(tasks);
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