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
  next();
});

// Índices para mejorar el rendimiento de las consultas
taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, completed: 1 });

// Método para marcar una tarea como completada
taskSchema.methods.markAsCompleted = function() {
  this.completed = true;
  this.completedAt = new Date();
  return this.save();
};

// Método para verificar si una tarea está vencida
taskSchema.methods.isOverdue = function() {
  if (!this.dueDate || this.completed) return false;
  return new Date() > this.dueDate;
};

// Método estático para obtener tareas pendientes
taskSchema.statics.getPendingTasks = function(userId) {
  return this.find({
    userId,
    completed: false,
    dueDate: { $gte: new Date() }
  }).sort({ dueDate: 1 });
};

// Método estático para obtener estadísticas
taskSchema.statics.getStats = async function(userId) {
  return this.aggregate([
    { $match: { userId: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: { $sum: { $cond: ['$completed', 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
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

// Agregar validación para la fecha de vencimiento
taskSchema.path('dueDate').validate(function(value) {
  if (value && value < new Date()) {
    throw new Error('La fecha de vencimiento no puede ser anterior a la fecha actual');
  }
  return true;
});

// Agregar un método para obtener tareas por categoría
taskSchema.statics.getTasksByCategory = function(userId, category) {
  return this.find({
    userId,
    category,
    completed: false
  }).sort({ dueDate: 1 });
};

// Agregar un método para obtener tareas por prioridad
taskSchema.statics.getTasksByPriority = function(userId, priority) {
  return this.find({
    userId,
    priority,
    completed: false
  }).sort({ dueDate: 1 });
};

// Agregar un método para obtener tareas para hoy
taskSchema.statics.getTodayTasks = function(userId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.find({
    userId,
    dueDate: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ priority: -1 });
};

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task; 