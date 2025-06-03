import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    // Asignar ambos campos para compatibilidad
    req.user = { _id: decoded.userId, userId: decoded.userId };
    next();
  });
}

// Middleware simplificado para validar token sin buscar usuario
export const validateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token no proporcionado o formato inválido' });
    }

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    console.error('Error validando token:', error);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    res.status(401).json({ message: 'Token inválido' });
  }
};

export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    console.log('Verificando rol:', {
      userRole: req.user.role,
      requiredRoles: roles
    });

    if (!roles.includes(req.user.role)) {
      console.log('Acceso denegado por rol');
      return res.status(403).json({ 
        message: 'No tienes permiso para realizar esta acción',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

// Middleware para verificar propiedad de un recurso (mejorado)
export const verifyOwnership = (model) => {
  return async (req, res, next) => {
    try {
      console.log('Verificando propiedad:', {
        resourceId: req.params.id,
        userId: req.user.id,
        model: model.modelName
      });

      const resource = await model.findById(req.params.id);
      
      if (!resource) {
        console.log('Recurso no encontrado');
        return res.status(404).json({ 
          message: 'Recurso no encontrado',
          resourceId: req.params.id
        });
      }
      
      // Verificar si el usuario es propietario del recurso
      const isOwner = resource.userId?.toString() === req.user.id?.toString();
      console.log('Verificación de propiedad:', {
        resourceOwner: resource.userId,
        requestUser: req.user.id,
        isOwner
      });

      if (!isOwner) {
        return res.status(403).json({ 
          message: 'No tienes permiso para acceder a este recurso',
          resourceId: req.params.id
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Error en verificación de propiedad:', error);
      res.status(500).json({ 
        message: 'Error al verificar propiedad del recurso',
        error: error.message 
      });
    }
  };
};