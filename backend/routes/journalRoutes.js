import express from 'express';
import Journal from '../models/Journal.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener todas las entradas del diario con filtros
router.get('/', async (req, res) => {
  try {
    const { mood, startDate, endDate, tags, search } = req.query;
    const query = { 
      userId: req.user._id,
      isDeleted: false
    };

    // Filtrar por estado de ánimo
    if (mood) {
      query.mood = mood;
    }

    // Filtrar por rango de fechas
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Filtrar por etiquetas
    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    // Búsqueda por contenido
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }

    const entries = await Journal.find(query)
      .sort({ createdAt: -1 });
    
    res.json(entries);
  } catch (error) {
    console.error('Error al obtener entradas del diario:', error);
    res.status(500).json({ message: 'Error al obtener las entradas', error: error.message });
  }
});

// Crear nueva entrada
router.post('/', async (req, res) => {
  try {
    console.log('Datos recibidos para nueva entrada:', req.body);
    
    const entry = new Journal({
      ...req.body,
      userId: req.user._id,
      date: new Date()
    });

    const validationError = entry.validateSync();
    if (validationError) {
      console.error('Error de validación:', validationError);
      return res.status(400).json({
        message: 'Error de validación',
        errors: Object.values(validationError.errors).map(err => err.message)
      });
    }

    const savedEntry = await entry.save();
    console.log('Entrada guardada exitosamente:', savedEntry);
    res.status(201).json({ success: true, data: savedEntry });
  } catch (error) {
    console.error('Error detallado al crear entrada:', error);
    res.status(400).json({ 
      message: 'Error al crear la entrada', 
      error: error.message,
      validationErrors: error.errors 
    });
  }
});

// Actualizar entrada
router.put('/:id', async (req, res) => {
  try {
    const allowedFields = ['content', 'mood', 'tags', 'images', 'metadata', 'privacy'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const entry = await Journal.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user._id,
        isDeleted: false
      },
      updates,
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Entrada no encontrada' });
    }
    res.json({ success: true, data: entry.toJSON() });
  } catch (error) {
    console.error('Error al actualizar entrada:', error);
    res.status(400).json({ 
      success: false,
      message: 'Error al actualizar la entrada', 
      error: error.message,
      validationErrors: error.errors 
    });
  }
});

// Eliminar entrada (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const entry = await Journal.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isDeleted: false
    });
    
    if (!entry) {
      return res.status(404).json({ message: 'Entrada no encontrada' });
    }

    await entry.softDelete();
    res.json({ message: 'Entrada eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar entrada:', error);
    res.status(500).json({ message: 'Error al eliminar la entrada', error: error.message });
  }
});

// Obtener resumen de estados de ánimo
router.get('/mood-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const summary = await Journal.getMoodSummary(
      req.user._id,
      new Date(startDate || new Date().setDate(new Date().getDate() - 30)), // último mes por defecto
      new Date(endDate || new Date())
    );
    res.json(summary);
  } catch (error) {
    console.error('Error al obtener resumen de estados de ánimo:', error);
    res.status(500).json({ message: 'Error al obtener el resumen', error: error.message });
  }
});

// Obtener entradas por etiquetas
router.get('/by-tags', async (req, res) => {
  try {
    const { tags } = req.query;
    if (!tags) {
      return res.status(400).json({ message: 'Se requieren etiquetas para la búsqueda' });
    }

    const entries = await Journal.getEntriesByTags(
      req.user._id,
      tags.split(',')
    );
    res.json(entries);
  } catch (error) {
    console.error('Error al obtener entradas por etiquetas:', error);
    res.status(500).json({ message: 'Error al obtener las entradas', error: error.message });
  }
});

// Cambiar privacidad de entrada
router.patch('/:id/privacy', async (req, res) => {
  try {
    const { privacy } = req.body;
    if (!['private', 'shared'].includes(privacy)) {
      return res.status(400).json({ message: 'Valor de privacidad inválido' });
    }

    const entry = await Journal.findOneAndUpdate(
      { 
        _id: req.params.id, 
        userId: req.user._id,
        isDeleted: false
      },
      { privacy },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ message: 'Entrada no encontrada' });
    }
    res.json(entry);
  } catch (error) {
    console.error('Error al actualizar privacidad:', error);
    res.status(400).json({ message: 'Error al actualizar la privacidad', error: error.message });
  }
});

export default router;
