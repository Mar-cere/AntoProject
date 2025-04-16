import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener mensajes de una conversación con filtros
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      page = 1, 
      limit = 50, 
      status, 
      type,
      role 
    } = req.query;

    const query = {
      conversationId,
      userId: req.user._id
    };

    // Aplicar filtros opcionales
    if (status) query.status = status;
    if (type) query.type = type;
    if (role) query.role = role;

    const messages = await Message.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    const total = await Message.countDocuments(query);

    res.json({
      messages: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({
      message: 'Error al obtener el historial de mensajes',
      error: error.message
    });
  }
});

// Crear nuevo mensaje
router.post('/messages', async (req, res) => {
  try {
    const message = new Message({
      ...req.body,
      userId: req.user._id,
      timestamp: new Date(),
      status: 'sent'
    });

    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error('Error al crear mensaje:', error);
    res.status(400).json({
      message: 'Error al crear el mensaje',
      error: error.message,
      validationErrors: error.errors
    });
  }
});

// Obtener todas las conversaciones del usuario con estadísticas
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: { userId: req.user._id }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$content' },
          lastMessageType: { $last: '$type' },
          lastMessageRole: { $last: '$role' },
          updatedAt: { $max: '$timestamp' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'sent'] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { updatedAt: -1 }
      }
    ]);

    res.json({ conversations });
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    res.status(500).json({
      message: 'Error al obtener las conversaciones',
      error: error.message
    });
  }
});

// Actualizar estado de mensajes
router.patch('/messages/status', async (req, res) => {
  try {
    const { messageIds, status } = req.body;

    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({
        message: 'Estado de mensaje inválido'
      });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds },
        userId: req.user._id
      },
      {
        $set: { status }
      }
    );

    res.json({
      message: `${result.modifiedCount} mensajes actualizados`,
      status
    });
  } catch (error) {
    console.error('Error al actualizar estado de mensajes:', error);
    res.status(500).json({
      message: 'Error al actualizar el estado de los mensajes',
      error: error.message
    });
  }
});

// Eliminar mensajes de una conversación
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { type } = req.query; // Opcional: eliminar solo cierto tipo de mensajes

    const query = {
      conversationId,
      userId: req.user._id
    };

    if (type) query.type = type;

    const result = await Message.deleteMany(query);

    res.json({
      message: 'Mensajes eliminados exitosamente',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error al eliminar mensajes:', error);
    res.status(500).json({
      message: 'Error al eliminar los mensajes',
      error: error.message
    });
  }
});

// Buscar mensajes con filtros avanzados
router.get('/messages/search', async (req, res) => {
  try {
    const { 
      query,
      type,
      role,
      status,
      startDate,
      endDate
    } = req.query;

    const searchQuery = {
      userId: req.user._id
    };

    if (query) {
      searchQuery.content = { $regex: query, $options: 'i' };
    }
    if (type) searchQuery.type = type;
    if (role) searchQuery.role = role;
    if (status) searchQuery.status = status;
    if (startDate || endDate) {
      searchQuery.timestamp = {};
      if (startDate) searchQuery.timestamp.$gte = new Date(startDate);
      if (endDate) searchQuery.timestamp.$lte = new Date(endDate);
    }

    const messages = await Message.find(searchQuery)
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({ 
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('Error en búsqueda de mensajes:', error);
    res.status(500).json({
      message: 'Error al buscar mensajes',
      error: error.message
    });
  }
});

export default router;
