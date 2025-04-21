import express from 'express';
import { authenticateToken as protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';
import UserProfile from '../models/UserProfile.js';

// Importar servicios individualmente para mejor control de errores
import openaiService from '../services/openaiService.js';
import emotionalAnalyzer from '../services/emotionalAnalyzer.js';
import contextAnalyzer from '../services/contextAnalyzer.js';
import goalTracker from '../services/goalTracker.js';
import memoryService from '../services/memoryService.js';
import userProfileService from '../services/userProfileService.js';
import progressTracker from '../services/progressTracker.js';

const router = express.Router();

const LIMITE_MENSAJES = 50;
const VENTANA_CONTEXTO = 30 * 60 * 1000; // 30 minutos en milisegundos

// Middleware para validar conversationId
const validarConversationId = (req, res, next) => {
  const { conversationId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      message: 'ID de conversación inválido'
    });
  }
  next();
};

// Obtener mensajes de una conversación con filtros
router.get('/conversations/:conversationId', protect, validarConversationId, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      page = 1, 
      limit = LIMITE_MENSAJES, 
      status, 
      type,
      role 
    } = req.query;

    const query = {
      conversationId,
      userId: req.user._id,
      ...(status && { status }),
      ...(type && { type }),
      ...(role && { role })
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Message.countDocuments(query)
    ]);

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
    const conversationId = new mongoose.Types.ObjectId().toString();
    const userPreferences = await userProfileService.getPersonalizedPrompt(req.user._id);
    
    const welcomeMessage = new Message({
      userId: req.user._id,
      content: await openaiService.generarSaludoPersonalizado(userPreferences),
      role: 'assistant',
      conversationId,
      type: 'system',
      isSystemMessage: true,
      metadata: {
        type: 'welcome',
        timestamp: new Date(),
        context: {
          preferences: userPreferences
        }
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
    const { conversationId, content, role = 'user' } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        message: 'El contenido del mensaje no puede estar vacío'
      });
    }

    const userMessage = new Message({
      userId: req.user._id,
      content,
      role,
      conversationId,
      metadata: {
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      }
    });

    if (role === 'user') {
      try {
        // Análisis inicial del mensaje
        const [conversationHistory, emotionalAnalysis, contextualAnalysis] = await Promise.all([
          Message.find({ 
            conversationId,
            timestamp: { $gte: new Date(Date.now() - VENTANA_CONTEXTO) }
          })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
          emotionalAnalyzer.analyzeEmotion(userMessage),
          contextAnalyzer.analizarMensaje(userMessage)
        ]);

        // Actualizar perfil y generar respuesta
        const [response, profileUpdates] = await Promise.all([
          openaiService.generarRespuesta(
            userMessage,
            {
              history: conversationHistory,
              emotional: emotionalAnalysis,
              contextual: contextualAnalysis
            }
          ),
          Promise.all([
            userProfileService.actualizarPerfil(req.user._id, userMessage, {
              emotional: emotionalAnalysis,
              contextual: contextualAnalysis
            }),
            memoryService.updateUserInsights(req.user._id, userMessage, emotionalAnalysis),
            goalTracker.trackProgress(req.user._id, userMessage),
            progressTracker.trackProgress(req.user._id, userMessage)
          ])
        ]);

        const assistantMessage = new Message({
          userId: req.user._id,
          content: response.content,
          role: 'assistant',
          conversationId,
          metadata: {
            timestamp: new Date(),
            type: 'text',
            status: 'sent',
            context: {
              emotional: emotionalAnalysis,
              contextual: contextualAnalysis,
              response: response.context
            }
          }
        });

        await Promise.all([
          userMessage.save(),
          assistantMessage.save()
        ]);

        res.status(201).json({
          userMessage,
          assistantMessage,
          context: {
            emotional: emotionalAnalysis,
            contextual: contextualAnalysis
          }
        });
      } catch (error) {
        console.error('Error procesando mensaje:', error);
        const errorMessage = new Message({
          userId: req.user._id,
          content: "Lo siento, ha ocurrido un error al procesar tu mensaje. ¿Podrías intentarlo de nuevo?",
          role: 'assistant',
          conversationId,
          metadata: {
            timestamp: new Date(),
            type: 'error',
            status: 'sent',
            error: error.message
          }
        });

        await Promise.all([
          userMessage.save(),
          errorMessage.save()
        ]);

        res.status(500).json({
          message: 'Error procesando el mensaje',
          error: error.message,
          userMessage,
          errorMessage
        });
      }
    } else {
      await userMessage.save();
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
      { $match: { userId: req.user._id } },
      { 
        $group: {
          _id: '$conversationId',
          lastMessage: { $last: '$content' },
          lastMessageType: { $last: '$type' },
          lastMessageRole: { $last: '$role' },
          updatedAt: { $max: '$timestamp' },
          messageCount: { $sum: 1 },
          unreadCount: {
            $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
          },
          emotionalContext: {
            $last: '$metadata.context.emotional'
          }
        }
      },
      { $sort: { updatedAt: -1 } }
    ]);

    res.json({ 
      conversations,
      stats: await userProfileService.getConversationStats(req.user._id)
    });
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

    if (!Array.isArray(messageIds) || !messageIds.length) {
      return res.status(400).json({
        message: 'Se requiere al menos un ID de mensaje'
      });
    }

    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return res.status(400).json({
        message: 'Estado de mensaje inválido'
      });
    }

    const result = await Message.updateMany(
      {
        _id: { $in: messageIds.filter(id => mongoose.Types.ObjectId.isValid(id)) },
        userId: req.user._id
      },
      {
        $set: { 
          status,
          'metadata.lastStatusUpdate': new Date()
        }
      }
    );

    res.json({
      message: `${result.modifiedCount} mensajes actualizados`,
      status,
      timestamp: new Date()
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

// Búsqueda avanzada de mensajes
router.get('/messages/search', protect, async (req, res) => {
  try {
    const { 
      query,
      type,
      role,
      status,
      startDate,
      endDate,
      emotion,
      intensity
    } = req.query;

    const searchQuery = {
      userId: req.user._id,
      ...(query && { content: { $regex: query, $options: 'i' } }),
      ...(type && { type }),
      ...(role && { role }),
      ...(status && { status }),
      ...(emotion && { 'metadata.context.emotional.mainEmotion': emotion }),
      ...(intensity && { 'metadata.context.emotional.intensity': parseInt(intensity) })
    };

    if (startDate || endDate) {
      searchQuery.timestamp = {
        ...(startDate && { $gte: new Date(startDate) }),
        ...(endDate && { $lte: new Date(endDate) })
      };
    }

    const messages = await Message.find(searchQuery)
      .sort({ timestamp: -1 })
      .limit(LIMITE_MENSAJES)
      .lean();

    res.json({ 
      messages,
      count: messages.length,
      query: searchQuery
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
