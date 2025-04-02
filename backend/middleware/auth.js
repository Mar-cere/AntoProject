import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticateToken = async (req, res, next) => {
  try {
    // 1. Obtener el token
    const authHeader = req.header('Authorization');
    console.log('Auth header recibido:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Token no proporcionado o formato inválido');
      return res.status(401).json({ message: 'No autorizado - Token no proporcionado o formato inválido' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído:', token);

    // 2. Verificar el token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodificado:', decoded);
    } catch (jwtError) {
      console.error('Error al verificar token:', jwtError);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      return res.status(401).json({ message: 'Token inválido' });
    }

    // 3. Buscar usuario
    const user = await User.findOne({ id: decoded.userId });
    console.log('Buscando usuario con ID:', decoded.userId);

    if (!user) {
      console.log('Usuario no encontrado para el ID:', decoded.userId);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Usuario autenticado:', user.email);

    // 4. Actualizar último acceso
    user.lastLogin = new Date();
    await user.save();

    // 5. Adjuntar usuario y token a la request
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Error inesperado en autenticación:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor durante la autenticación',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

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