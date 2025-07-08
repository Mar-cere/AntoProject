/**
 * Modelo de Tarea
 * 
 * Este modelo define la estructura de datos para tareas y recordatorios en la aplicación.
 * Proporciona métodos para gestionar tareas, recordatorios, notificaciones y estadísticas.
 * 
 * @version 1.3.0
 * @author AntoApp Team
 */
import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(16).toString('hex'),
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'El título es requerido'],
    trim: true,
    minlength: [1, 'El título debe tener al menos 1 carácter'],
    maxlength: [100, 'El título debe tener máximo 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'La descripción debe tener máximo 500 caracteres'],
    default: ''
  },
  dueDate: {
    type: Date,
    required: [true, 'La fecha de vencimiento es requerida'],
    validate: {
      validator: function(value) {
        return value && value >= new Date(new Date().setHours(0, 0, 0, 0));
      },
      message: 'La fecha de vencimiento no puede ser anterior a hoy'
    }
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'La prioridad debe ser: low, medium, high o urgent'
    },
    default: 'medium'
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'in_progress', 'completed', 'cancelled'],
      message: 'El estado debe ser: pending, in_progress, completed o cancelled'
    },
    default: 'pending'
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    validate: {
      validator: function(value) {
        if (this.completed && !value) {
          return false;
        }
        return true;
      },
      message: 'La fecha de completado es requerida cuando la tarea está completada'
    }
  },
  // Campo para distinguir entre tareas y recordatorios
  itemType: {
    type: String,
    enum: {
      values: ['task', 'reminder', 'goal'],
      message: 'El tipo debe ser: task, reminder o goal'
    },
    default: 'task'
  },
  // Campos específicos para recordatorios
  isReminder: {
    type: Boolean,
    default: false
  },
  // Sistema de notificaciones mejorado
  notifications: {
    enabled: {
      type: Boolean,
      default: true
    },
    reminderTime: {
      type: Date,
      validate: {
        validator: function(value) {
          if (this.notifications.enabled && !value) {
            return false;
          }
          return true;
        },
        message: 'La hora de recordatorio es requerida cuando las notificaciones están habilitadas'
      }
    },
    repeatReminder: {
      type: Boolean,
      default: false
    },
    reminderInterval: {
      type: Number, // minutos
      min: [5, 'El intervalo mínimo es 5 minutos'],
      max: [1440, 'El intervalo máximo es 24 horas'],
      default: 30
    }
  },
  // Sistema de repetición mejorado
  repeat: {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'none'
    },
    interval: {
      type: Number,
      min: [1, 'El intervalo debe ser al menos 1'],
      default: 1
    },
    endDate: {
      type: Date,
      validate: {
        validator: function(value) {
          if (this.repeat.type !== 'none' && value && value <= this.dueDate) {
            return false;
          }
          return true;
        },
        message: 'La fecha de fin debe ser posterior a la fecha de vencimiento'
      }
    },
    daysOfWeek: [{
      type: Number,
      min: [0, 'Los días de la semana deben estar entre 0 y 6'],
      max: [6, 'Los días de la semana deben estar entre 0 y 6']
    }],
    lastGenerated: {
      type: Date
    }
  },
  // Categorías y etiquetas
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'La categoría debe tener máximo 50 caracteres'],
    default: 'General'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Cada etiqueta debe tener máximo 20 caracteres']
  }],
  // Estimaciones de tiempo
  estimatedTime: {
    type: Number, // minutos
    min: [0, 'El tiempo estimado no puede ser negativo'],
    max: [1440, 'El tiempo estimado máximo es 24 horas']
  },
  actualTime: {
    type: Number, // minutos
    min: [0, 'El tiempo real no puede ser negativo']
  },
  // Progreso para tareas complejas
  progress: {
    type: Number,
    min: [0, 'El progreso no puede ser negativo'],
    max: [100, 'El progreso no puede exceder 100%'],
    default: 0
  },
  // Subtareas
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'El título de la subtarea debe tener máximo 100 caracteres']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  // Referencias
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido'],
    index: true
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: function(value) {
        return !value || value.toString() !== this._id.toString();
      },
      message: 'Una tarea no puede ser padre de sí misma'
    }
  },
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Índices para mejorar rendimiento
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, itemType: 1 });
taskSchema.index({ userId: 1, priority: 1 });
taskSchema.index({ userId: 1, category: 1 });
taskSchema.index({ 'notifications.reminderTime': 1 });
taskSchema.index({ createdAt: -1 });
taskSchema.index({ completed: 1, dueDate: 1 });

// Virtuals
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.completed || this.status === 'cancelled') return false;
  return new Date() > this.dueDate;
});

taskSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

taskSchema.virtual('completionRate').get(function() {
  if (this.subtasks.length === 0) {
    return this.completed ? 100 : 0;
  }
  const completedSubtasks = this.subtasks.filter(subtask => subtask.completed).length;
  return Math.round((completedSubtasks / this.subtasks.length) * 100);
});

// Middleware pre-save
taskSchema.pre('save', function(next) {
  // Generar ID si no existe
  if (!this.id) {
    this.id = require('crypto').randomBytes(16).toString('hex');
  }
  
  // Actualizar isReminder basado en itemType
  this.isReminder = this.itemType === 'reminder';
  
  // Actualizar completed basado en status
  if (this.status === 'completed' && !this.completed) {
    this.completed = true;
    this.completedAt = new Date();
  } else if (this.status !== 'completed' && this.completed) {
    this.completed = false;
    this.completedAt = undefined;
  }
  
  // Actualizar progress basado en subtareas
  if (this.subtasks.length > 0) {
    this.progress = this.completionRate;
  }
  
  next();
});

// Métodos de instancia
taskSchema.methods.markAsCompleted = function() {
  if (this.itemType === 'reminder') {
    throw new Error('Los recordatorios no pueden marcarse como completados');
  }
  
  this.status = 'completed';
  this.completed = true;
  this.completedAt = new Date();
  this.progress = 100;
  
  return this.save();
};

taskSchema.methods.markAsInProgress = function() {
  if (this.itemType === 'reminder') {
    throw new Error('Los recordatorios no pueden marcarse como en progreso');
  }
  
  this.status = 'in_progress';
  return this.save();
};

taskSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

taskSchema.methods.addSubtask = function(subtaskTitle) {
  this.subtasks.push({
    title: subtaskTitle,
    completed: false
  });
  return this.save();
};

taskSchema.methods.completeSubtask = function(subtaskIndex) {
  if (subtaskIndex >= 0 && subtaskIndex < this.subtasks.length) {
    this.subtasks[subtaskIndex].completed = true;
    this.subtasks[subtaskIndex].completedAt = new Date();
    return this.save();
  }
  throw new Error('Índice de subtarea inválido');
};

// Métodos estáticos
taskSchema.statics.getPendingItems = function(userId, type = null, options = {}) {
  const query = {
    userId,
    status: { $nin: ['completed', 'cancelled'] },
    deletedAt: { $exists: false }
  };
  
  if (type) {
    query.itemType = type;
  }
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  const sort = options.sort || { dueDate: 1 };
  const limit = options.limit || 50;
  const skip = options.skip || 0;

  return this.find(query)
    .sort(sort)
    .limit(limit)
    .skip(skip)
    .populate('parentTask', 'title');
};

taskSchema.statics.getOverdueItems = function(userId) {
  return this.find({
    userId,
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] },
    deletedAt: { $exists: false }
  }).sort({ dueDate: 1 });
};

taskSchema.statics.getStats = async function(userId) {
  const stats = await this.aggregate([
    { 
      $match: { 
        userId: mongoose.Types.ObjectId(userId),
        deletedAt: { $exists: false }
      } 
    },
    {
      $group: {
        _id: '$itemType',
        total: { $sum: 1 },
        completed: { 
          $sum: { 
            $cond: [
              { $eq: ['$status', 'completed'] }, 
              1, 
              0
            ] 
          }
        },
        inProgress: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'in_progress'] },
              1,
              0
            ]
          }
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'completed'] },
                  { $ne: ['$status', 'cancelled'] },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        urgent: {
          $sum: {
            $cond: [
              { $eq: ['$priority', 'urgent'] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Calcular estadísticas adicionales
  const totalTasks = stats.reduce((sum, stat) => sum + stat.total, 0);
  const totalCompleted = stats.reduce((sum, stat) => sum + stat.completed, 0);
  const completionRate = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  return {
    byType: stats,
    summary: {
      total: totalTasks,
      completed: totalCompleted,
      completionRate: Math.round(completionRate),
      overdue: stats.reduce((sum, stat) => sum + stat.overdue, 0),
      urgent: stats.reduce((sum, stat) => sum + stat.urgent, 0)
    }
  };
};

taskSchema.statics.getItemsByDate = function(userId, date, type = null) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const query = {
    userId,
    dueDate: {
      $gte: startOfDay,
      $lt: endOfDay
    },
    deletedAt: { $exists: false }
  };

  if (type) {
    query.itemType = type;
  }

  return this.find(query).sort({ dueDate: 1 });
};

taskSchema.statics.getUpcomingReminders = function(userId, hours = 24) {
  const now = new Date();
  const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

  return this.find({
    userId,
    itemType: 'reminder',
    'notifications.reminderTime': {
      $gte: now,
      $lte: future
    },
    status: { $ne: 'cancelled' },
    deletedAt: { $exists: false }
  }).sort({ 'notifications.reminderTime': 1 });
};

// Método para soft delete
taskSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  return this.save();
};

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task; 