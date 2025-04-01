import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth header recibido:', authHeader);

    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      console.log('Token no proporcionado');
      return res.status(401).json({ message: 'No autorizado' });
    }

    console.log('Token extraído:', token);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);

    const user = await User.findOne({ id: decoded.userId });
    console.log('Buscando usuario con ID:', decoded.userId);

    if (!user) {
      console.log('Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Usuario autenticado:', user);

    // Actualizar último acceso
    user.lastLogin = new Date();
    await user.save();

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    res.status(401).json({ message: 'No autorizado' });
  }
};

// Middleware para verificar roles (con más detalle en los errores)
export const authorizeRole = (roles) => {
  return (req, res, next) => {
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

// Nuevo middleware para verificar token sin requerir usuario
export const validateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    console.error('Error validando token:', error);
    res.status(401).json({ message: 'Token inválido' });
  }
};