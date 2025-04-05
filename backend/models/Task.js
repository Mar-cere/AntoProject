import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  // Nuevo campo para distinguir entre tareas y recordatorios
  itemType: {
    type: String,
    enum: ['task', 'reminder'],
    default: 'task'
  },
  // Campos específicos para recordatorios
  isReminder: {
    type: Boolean,
    default: false
  },
  // Campo para notificaciones (lo usaremos más adelante)
  notification: {
    enabled: {
      type: Boolean,
      default: false
    },
    time: {
      type: Date
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt antes de cada actualización
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  // Actualizar isReminder basado en itemType
  this.isReminder = this.itemType === 'reminder';
  next();
});

// Índices actualizados
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, completed: 1 });
taskSchema.index({ userId: 1, itemType: 1 }); // Nuevo índice para filtrar por tipo

// Método para marcar una tarea como completada
taskSchema.methods.markAsCompleted = function() {
  if (this.itemType === 'task') {
    this.completed = true;
    this.completedAt = new Date();
    return this.save();
  }
  throw new Error('Los recordatorios no pueden marcarse como completados');
};

// Método para verificar si una tarea/recordatorio está vencido
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || (this.itemType === 'task' && this.completed)) return false;
  return new Date() > this.dueDate;
};

// Método estático para obtener tareas pendientes (incluyendo recordatorios)
taskSchema.statics.getPendingItems = function(userId, type = null) {
  const query = {
    userId,
    dueDate: { $gte: new Date() }
  };
  
  if (type) {
    query.itemType = type;
  }
  
  if (type === 'task') {
    query.completed = false;
  }

  return this.find(query).sort({ dueDate: 1 });
};

// Método estático para obtener estadísticas
taskSchema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$itemType',
        total: { $sum: 1 },
        completed: { 
          $sum: { 
            $cond: [
              { $and: [
                { $eq: ['$itemType', 'task'] },
                '$completed'
              ]}, 
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
                  { $eq: ['$itemType', 'task'] },
                  { $not: '$completed' },
                  { $lt: ['$dueDate', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

// Validación de fecha de vencimiento
taskSchema.path('dueDate').validate(function(value) {
  if (value && value < new Date()) {
    throw new Error('La fecha de vencimiento no puede ser anterior a la fecha actual');
  }
  return true;
});

// Método para obtener items por tipo y fecha
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
    }
  };

  if (type) {
    query.itemType = type;
  }

  return this.find(query).sort({ dueDate: 1 });
};

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task; 