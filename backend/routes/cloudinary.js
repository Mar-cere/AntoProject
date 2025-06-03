import express from 'express';
import cloudinary from 'cloudinary';
import { authenticateToken } from '../middleware/auth.js';
import Joi from 'joi';

const router = express.Router();

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Esquemas de validación
const signatureSchema = Joi.object({
  type: Joi.string().valid('avatar', 'background', 'attachment').required(),
  folder: Joi.string().required(),
  allowed_formats: Joi.array().items(Joi.string()).default(['jpg', 'png', 'gif', 'webp']),
  max_size: Joi.number().default(5242880), // 5MB por defecto
  transformation: Joi.object({
    width: Joi.number(),
    height: Joi.number(),
    crop: Joi.string(),
    quality: Joi.string()
  })
});

// Middleware para validar presets
const validatePreset = (type) => {
  const presets = {
    avatar: {
      upload_preset: 'Anto Avatar',
      transformation: [
        { width: 200, height: 200, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    },
    background: {
      upload_preset: 'Anto Background',
      transformation: [
        { width: 1920, height: 1080, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    },
    attachment: {
      upload_preset: 'Anto Attachment',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    }
  };

  return presets[type] || presets.attachment;
};

// Obtener firma para subida
router.post('/signature', authenticateToken, async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = signatureSchema.validate(req.body, { stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Datos inválidos',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { type, folder, allowed_formats, max_size, transformation } = value;
    const preset = validatePreset(type);

    const timestamp = Math.round((new Date).getTime()/1000);
    const paramsToSign = {
      timestamp,
      upload_preset: preset.upload_preset,
      type: 'authenticated',
      folder,
      allowed_formats,
      max_size,
      transformation: JSON.stringify(preset.transformation)
    };

    const signature = cloudinary.v2.utils.api_sign_request(
      paramsToSign, 
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      uploadPreset: preset.upload_preset,
      params: paramsToSign
    });
  } catch (error) {
    console.error('Error generando firma:', error);
    res.status(500).json({
      message: 'Error al generar firma de subida',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Eliminar recurso
router.delete('/resource/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;
    const { type } = req.query;

    if (!publicId) {
      return res.status(400).json({
        message: 'ID del recurso requerido'
      });
    }

    // Validar que el recurso pertenece al usuario
    const result = await cloudinary.v2.uploader.destroy(publicId, {
      type: type || 'authenticated',
      invalidate: true
    });

    if (result.result !== 'ok') {
      return res.status(400).json({
        message: 'Error al eliminar el recurso',
        result
      });
    }

    res.json({
      message: 'Recurso eliminado correctamente',
      result
    });
  } catch (error) {
    console.error('Error eliminando recurso:', error);
    res.status(500).json({
      message: 'Error al eliminar el recurso',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtener recursos del usuario
router.get('/resources', authenticateToken, async (req, res) => {
  try {
    const { type = 'authenticated', max_results = 10, next_cursor } = req.query;

    const result = await cloudinary.v2.search
      .expression(`folder:${req.user._id}/*`)
      .sort_by('created_at', 'desc')
      .max_results(max_results)
      .next_cursor(next_cursor)
      .execute();

    res.json({
      resources: result.resources,
      next_cursor: result.next_cursor
    });
  } catch (error) {
    console.error('Error obteniendo recursos:', error);
    res.status(500).json({
      message: 'Error al obtener recursos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
