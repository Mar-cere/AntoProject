import jwt from 'jsonwebtoken';
import User from '../models/UserSchema.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    console.log('Auth header recibido:', authHeader); // Para debug

    if (!authHeader) {
      return res.status(401).json({ message: 'No se proporcionó token de autenticación' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extraído:', token); // Para debug

    if (!token) {
      return res.status(401).json({ message: 'Token no válido' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token decodificado:', decoded); // Para debug

      const user = await User.findOne({ id: decoded.userId });
      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      req.user = user;
      req.userId = decoded.userId;
      next();
    } catch (error) {
      console.error('Error al verificar token:', error);
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token inválido' });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expirado' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({ message: 'Error en la autenticación' });
  }
};

// Middleware opcional para verificar roles
export const authorizeRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'No tienes permiso para realizar esta acción' 
      });
    }
    next();
  };
};

// Middleware para verificar propiedad de un recurso
export const verifyOwnership = (model) => {
  return async (req, res, next) => {
    try {
      const resource = await model.findById(req.params.id);
      if (!resource) {
        return res.status(404).json({ message: 'Recurso no encontrado' });
      }
      
      if (resource.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ 
          message: 'No tienes permiso para acceder a este recurso' 
        });
      }
      
      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error al verificar propiedad del recurso' });
    }
  };
};