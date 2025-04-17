import express from 'express';
import { authenticateToken as protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
import openaiService from '../services/openaiService.js';

const router = express.Router();

// Obtener mensajes de una conversación con filtros
router.get('/conversations/:conversationId', protect, async (req, res) => {
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

// Crear nueva conversación
router.post('/conversations', protect, async (req, res) => {
  try {
    // Generar un conversationId único
    const conversationId = new mongoose.Types.ObjectId().toString();
    
    // Crear mensaje inicial del sistema
    const welcomeMessage = new Message({
      userId: req.user._id,
      content: '¡Hola! Soy Anto, tu asistente personal. ¿En qué puedo ayudarte hoy?',
      role: 'assistant',
      conversationId,
      type: 'system',
      isSystemMessage: true,
      metadata: {
        type: 'welcome',
        timestamp: new Date()
      }
    });

    await welcomeMessage.save();

    res.status(201).json({
      conversationId,
      message: welcomeMessage
    });
  } catch (error) {
    console.error('Error al crear conversación:', error);
    res.status(500).json({
      message: 'Error al crear la conversación',
      error: error.message
    });
  }
});

// Crear nuevo mensaje
router.post('/messages', protect, async (req, res) => {
  try {
    const { conversationId, content, role = 'user', type = 'text' } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({
        message: 'Se requiere conversationId y contenido del mensaje'
      });
    }

    // Crear y guardar mensaje del usuario
    const userMessage = new Message({
      userId: req.user._id,
      content,
      role,
      conversationId,
      type,
      timestamp: new Date(),
      status: 'sent',
      metadata: {
        ...req.body.metadata,
        timestamp: new Date()
      }
    });

    await userMessage.save();

    // Si el mensaje es del usuario, generar respuesta del asistente
    if (role === 'user') {
      try {
        // Obtener historial reciente de la conversación (últimos 5 mensajes)
        const conversationHistory = await Message.find({ conversationId })
          .sort({ timestamp: -1 })
          .limit(5)
          .lean();

        // Generar respuesta con OpenAI
        const aiResponse = await openaiService.generateAIResponse(
          content,
          conversationHistory.reverse()
        );

        // Analizar emociones del mensaje del usuario
        const emotionAnalysis = await openaiService.analyzeEmotions(content);

        // Crear mensaje del asistente
        const assistantMessage = new Message({
          userId: req.user._id,
          content: aiResponse.content,
          role: 'assistant',
          conversationId,
          type: 'text',
          timestamp: new Date(),
          status: 'sent',
          metadata: {
            ...aiResponse.metadata,
            emotionAnalysis,
            timestamp: new Date()
          }
        });

        await assistantMessage.save();

        res.status(201).json({
          userMessage,
          assistantMessage
        });
      } catch (error) {
        console.error('Error al generar respuesta:', error);
        
        // Si hay error en la generación de la respuesta, enviar mensaje de error
        const errorMessage = new Message({
          userId: req.user._id,
          content: 'Lo siento, tuve un problema al procesar tu mensaje. ¿Podrías intentarlo de nuevo?',
          role: 'assistant',
          conversationId,
          type: 'error',
          timestamp: new Date(),
          status: 'error',
          metadata: {
            error: error.message,
            timestamp: new Date()
          }
        });

        await errorMessage.save();

        res.status(201).json({
          userMessage,
          assistantMessage: errorMessage
        });
      }
    } else {
      res.status(201).json({ message: userMessage });
    }
  } catch (error) {
    console.error('Error en POST /messages:', error);
    res.status(500).json({
      message: 'Error al procesar el mensaje',
      error: error.message
    });
  }
});

// Obtener todas las conversaciones del usuario con estadísticas
router.get('/conversations', protect, async (req, res) => {
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
router.patch('/messages/status', protect, async (req, res) => {
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
router.delete('/conversations/:conversationId', protect, async (req, res) => {
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
router.get('/messages/search', protect, async (req, res) => {
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
