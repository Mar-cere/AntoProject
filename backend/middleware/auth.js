import jwt from 'jsonwebtoken';
import User from '../models/UserSchema.js';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No autorizado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ id: decoded.userId });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'No autorizado' });
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