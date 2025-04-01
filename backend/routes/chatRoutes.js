import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import Message from '../models/Message.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Obtener historial de conversación
router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({
      conversationId,
      userId: req.user.id
    })
    .sort({ timestamp: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit))
    .exec();

    const total = await Message.countDocuments({
      conversationId,
      userId: req.user.id
    });

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
      message: 'Error al obtener el historial de mensajes'
    });
  }
});

// Obtener todas las conversaciones del usuario
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Message.aggregate([
      {
        $match: { userId: req.user.id }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$content' },
          updatedAt: { $max: '$timestamp' },
          messageCount: { $sum: 1 }
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
      message: 'Error al obtener las conversaciones'
    });
  }
});

// Marcar mensajes como leídos
router.put('/messages/read', async (req, res) => {
  try {
    const { messageIds } = req.body;

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        userId: req.user.id
      },
      {
        $set: { status: 'read' }
      }
    );

    res.json({
      message: 'Mensajes marcados como leídos'
    });
  } catch (error) {
    console.error('Error al marcar mensajes como leídos:', error);
    res.status(500).json({
      message: 'Error al actualizar el estado de los mensajes'
    });
  }
});

// Eliminar una conversación
router.delete('/conversations/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Message.deleteMany({
      conversationId,
      userId: req.user.id
    });

    res.json({
      message: 'Conversación eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar conversación:', error);
    res.status(500).json({
      message: 'Error al eliminar la conversación'
    });
  }
});

// Buscar en mensajes
router.get('/messages/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    const messages = await Message.find({
      userId: req.user.id,
      content: { $regex: query, $options: 'i' }
    })
    .sort({ timestamp: -1 })
    .limit(20);

    res.json({ messages });
  } catch (error) {
    console.error('Error en búsqueda de mensajes:', error);
    res.status(500).json({
      message: 'Error al buscar mensajes'
    });
  }
});

export default router;
