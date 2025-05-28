import express from 'express';
import mongoose from 'mongoose';
import { authenticateToken as protect } from '../middleware/auth.js';
import {
  Message,
  UserProfile,
  TherapeuticRecord,
  UserProgress,
  UserInsight,
  Conversation
} from '../models/index.js';
import {
  openaiService,
  emotionalAnalyzer,
  contextAnalyzer,
  memoryService,
  personalizationService,
  progressTracker,
  goalTracker,
  responseGenerator,
  userProfileService
} from '../services/index.js';

const router = express.Router();

const LIMITE_MENSAJES = 50;
const VENTANA_CONTEXTO = 30 * 60 * 1000; // 30 minutos en milisegundos

// Middleware para validar conversationId
const validarConversationId = (req, res, next) => {
  const { conversationId } = req.params;
  
  if (!conversationId) {
    return res.status(400).json({
      message: 'ID de conversación requerido'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({
      message: 'ID de conversación inválido'
    });
  }
  next();
};

const validarConversacion = async (req, res, next) => {
  const { conversationId } = req.params;
  const conversation = await Conversation.findOne({ _id: conversationId, userId: req.user._id });
  if (!conversation) {
    return res.status(404).json({ message: 'Conversación no encontrada' });
  }
  req.conversation = conversation;
  next();
};

// Obtener mensajes de una conversación
router.get('/conversations/:conversationId', protect, validarConversationId, validarConversacion, async (req, res) => {
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
      userId: req.user._id,
      ...(status && { status }),
      ...(type && { type }),
      ...(role && { role })
    };

    const [messages, total] = await Promise.all([
      Message.find(query)
        .sort({ 'metadata.timestamp': -1 })
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
    console.error('Error obteniendo mensajes:', error);
    res.status(500).json({
      message: 'Error al obtener el historial de mensajes',
      error: error.message
    });
  }
});

// Crear nueva conversación
router.post('/conversations', protect, async (req, res) => {
  try {
    // Fuerza el tipo ObjectId para userId y participants
    const userId = mongoose.Types.ObjectId(req.user._id);
    const conversation = new Conversation({
      userId,
      participants: [userId], // Siempre como ObjectId
    });
    await conversation.save();

    // Crea el mensaje de bienvenida
    const userPreferences = await userProfileService.getPersonalizedPrompt(userId);
    const welcomeMessage = new Message({
      userId,
      content: await openaiService.generarSaludoPersonalizado(userPreferences),
      role: 'assistant',
      conversationId: conversation._id.toString(),
      type: 'system',
      isSystemMessage: true,
      metadata: {
        type: 'system',
        timestamp: new Date(),
        context: {
          preferences: userPreferences
        }
      }
    });
    await welcomeMessage.save();

    res.status(201).json({
      conversationId: conversation._id.toString(),
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
  const startTime = Date.now();
  const logs = [];
  let userMessage = null;
  let assistantMessage = null;
  
  try {
    const { conversationId, content, role = 'user' } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        message: 'El contenido del mensaje es requerido'
      });
    }

    const messageCount = await Message.countDocuments({ conversationId });
    if (messageCount >= LIMITE_MENSAJES) {
      return res.status(400).json({ message: 'Límite de mensajes alcanzado' });
    }

    logs.push(`[${Date.now() - startTime}ms] Iniciando procesamiento de mensaje`);

    // 1. Crear mensaje del usuario
    userMessage = new Message({
      userId: req.user._id,
      content: content.trim(),
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
        // 2. Obtener contexto e historial
        logs.push(`[${Date.now() - startTime}ms] Obteniendo contexto e historial`);
        const [conversationHistory, userProfile, therapeuticRecord] = await Promise.all([
          Message.find({ 
            conversationId,
            timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
          })
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
          userProfileService.getOrCreateProfile(req.user._id),
          TherapeuticRecord.findOne({ userId: req.user._id })
        ]);

        // 3. Análisis y generación de respuesta
        logs.push(`[${Date.now() - startTime}ms] Realizando análisis del mensaje`);
        const [emotionalAnalysis, contextualAnalysis] = await Promise.all([
          emotionalAnalyzer.analyzeEmotion(content, conversationHistory),
          contextAnalyzer.analizarMensaje(userMessage, conversationHistory)
        ]);

        // 4. Guardar mensaje del usuario primero
        await userMessage.save();

        // 5. Generar respuesta
        logs.push(`[${Date.now() - startTime}ms] Generando respuesta`);
        const response = await openaiService.generarRespuesta(
          userMessage,
          {
            history: conversationHistory,
            emotional: emotionalAnalysis,
            contextual: contextualAnalysis,
            profile: userProfile,
            therapeutic: therapeuticRecord
          }
        );

        // Validar coherencia emocional
        if (!openaiService.esCoherenteConEmocion(response.content, emotionalAnalysis)) {
          response.content = openaiService.ajustarCoherenciaEmocional(response.content, emotionalAnalysis);
        }

        // 6. Crear y guardar mensaje del asistente
        assistantMessage = new Message({
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
              response: JSON.stringify(response.context)
            }
          }
        });

        await assistantMessage.save();

        // 7. Actualizar registros en paralelo
        logs.push(`[${Date.now() - startTime}ms] Actualizando registros adicionales`);
        await Promise.all([
          progressTracker.trackProgress(req.user._id, {
            userMessage,
            assistantMessage,
            analysis: {
              emotional: emotionalAnalysis,
              contextual: contextualAnalysis
            }
          }),
          userProfileService.actualizarPerfil(req.user._id, userMessage, {
            emotional: emotionalAnalysis,
            contextual: contextualAnalysis
          }),
          Conversation.findByIdAndUpdate(conversationId, { lastMessage: assistantMessage._id })
        ]).catch(error => {
          console.warn('Error en actualizaciones secundarias:', error);
          logs.push(`[${Date.now() - startTime}ms] Advertencia: Error en actualizaciones secundarias`);
        });

        logs.push(`[${Date.now() - startTime}ms] Proceso completado exitosamente`);
        
        return res.status(201).json({
          userMessage,
          assistantMessage,
          context: {
            emotional: emotionalAnalysis,
            contextual: contextualAnalysis
          },
          processingTime: Date.now() - startTime
        });

      } catch (error) {
        logs.push(`[${Date.now() - startTime}ms] Error: ${error.message}`);
        console.error('Error procesando mensaje:', {
          error,
          logs,
          userId: req.user._id,
          messageContent: content
        });

        // Si el mensaje del usuario ya se guardó, crear mensaje de error
        if (userMessage._id) {
          assistantMessage = new Message({
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

          await assistantMessage.save();
        }

        return res.status(500).json({
          message: 'Error procesando el mensaje',
          error: error.message,
          userMessage: userMessage._id ? userMessage : null,
          errorMessage: assistantMessage,
          logs
        });
      }
    } else {
      // Para mensajes que no son del usuario
      const savedMessage = await userMessage.save();
      return res.status(201).json({ message: savedMessage });
    }

  } catch (error) {
    logs.push(`[${Date.now() - startTime}ms] Error crítico: ${error.message}`);
    console.error('Error crítico en POST /messages:', {
      error,
      logs,
      userId: req?.user?._id
    });

    return res.status(500).json({
      message: 'Error crítico al procesar el mensaje',
      error: error.message,
      logs
    });
  }
});

// Obtener todas las conversaciones del usuario con estadísticas
router.get('/conversations', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
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
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
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

    const messages = await Message.find({ _id: { $in: messageIds }, userId: req.user._id });
    if (messages.length !== messageIds.length) {
      return res.status(400).json({ message: 'Algunos mensajes no existen o no pertenecen al usuario' });
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
