import mongoose from 'mongoose';

const progressEntrySchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  emotionalState: {
    mainEmotion: {
      type: String,
      required: true
    },
    intensity: {
      type: Number,
      min: 1,
      max: 10,
      required: true
    },
    secondaryEmotions: [{
      emotion: String,
      intensity: Number
    }]
  },
  context: {
    topic: {
      type: String,
      required: true
    },
    triggers: [String],
    copingStrategies: [String]
  },
  insights: [{
    type: String,
    timestamp: Date
  }],
  sessionMetrics: {
    duration: Number,
    messageCount: Number,
    responseQuality: {
      type: Number,
      min: 1,
      max: 5
    }
  }
});

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  entries: [progressEntrySchema],
  overallMetrics: {
    totalSessions: {
      type: Number,
      default: 0
    },
    averageSessionDuration: Number,
    emotionalTrends: {
      predominantEmotions: [{
        emotion: String,
        frequency: Number
      }],
      averageIntensity: Number
    },
    commonTopics: [{
      topic: String,
      frequency: Number
    }],
    effectiveCopingStrategies: [{
      strategy: String,
      effectiveness: Number
    }]
  },
  goals: [{
    description: String,
    createdAt: {
      type: Date,
      default: Date.now
    },
    targetDate: Date,
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    status: {
      type: String,
      enum: ['pendiente', 'en_progreso', 'completado', 'abandonado'],
      default: 'pendiente'
    },
    relatedEntries: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProgressEntry'
    }]
  }],
  lastUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas comunes
userProgressSchema.index({ 'entries.timestamp': -1 });
userProgressSchema.index({ 'goals.status': 1 });
userProgressSchema.index({ 'goals.targetDate': 1 });

// Middleware para actualizar lastUpdate
userProgressSchema.pre('save', function(next) {
  this.lastUpdate = new Date();
  next();
});

// Método para agregar una nueva entrada de progreso
userProgressSchema.methods.addProgressEntry = async function(entryData) {
  this.entries.push(entryData);
  await this.updateOverallMetrics();
  return this.save();
};

// Método para actualizar métricas generales
userProgressSchema.methods.updateOverallMetrics = async function() {
  if (!this.entries.length) return;

  // Calcular métricas básicas
  this.overallMetrics.totalSessions = this.entries.length;

  // Calcular duración promedio de sesiones
  const totalDuration = this.entries.reduce((sum, entry) => 
    sum + (entry.sessionMetrics?.duration || 0), 0);
  this.overallMetrics.averageSessionDuration = totalDuration / this.entries.length;

  // Analizar tendencias emocionales
  const emotionCounts = {};
  let totalIntensity = 0;

  this.entries.forEach(entry => {
    const emotion = entry.emotionalState.mainEmotion;
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    totalIntensity += entry.emotionalState.intensity;
  });

  this.overallMetrics.emotionalTrends = {
    predominantEmotions: Object.entries(emotionCounts)
      .map(([emotion, count]) => ({
        emotion,
        frequency: count / this.entries.length
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5),
    averageIntensity: totalIntensity / this.entries.length
  };

  // Analizar temas comunes
  const topicCounts = {};
  this.entries.forEach(entry => {
    const topic = entry.context.topic;
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });

  this.overallMetrics.commonTopics = Object.entries(topicCounts)
    .map(([topic, count]) => ({
      topic,
      frequency: count / this.entries.length
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  // Analizar estrategias de afrontamiento efectivas
  const strategyEffectiveness = {};
  this.entries.forEach(entry => {
    entry.context.copingStrategies.forEach(strategy => {
      if (!strategyEffectiveness[strategy]) {
        strategyEffectiveness[strategy] = {
          total: 0,
          count: 0
        };
      }
      strategyEffectiveness[strategy].total += entry.sessionMetrics.responseQuality || 3;
      strategyEffectiveness[strategy].count += 1;
    });
  });

  this.overallMetrics.effectiveCopingStrategies = Object.entries(strategyEffectiveness)
    .map(([strategy, data]) => ({
      strategy,
      effectiveness: data.total / data.count
    }))
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 5);
};

// Método para obtener resumen de progreso
userProgressSchema.methods.getProgressSummary = function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentEntries = this.entries.filter(entry => 
    entry.timestamp >= cutoffDate
  );

  return {
    recentProgress: {
      totalSessions: recentEntries.length,
      emotionalTrends: this.analyzeRecentEmotions(recentEntries),
      activeGoals: this.goals.filter(goal => 
        goal.status === 'en_progreso'
      ),
      recentInsights: this.getRecentInsights(recentEntries)
    },
    overallMetrics: this.overallMetrics
  };
};

// Método auxiliar para analizar emociones recientes
userProgressSchema.methods.analyzeRecentEmotions = function(entries) {
  // Implementación similar a updateOverallMetrics pero solo para entradas recientes
  // ... código de análisis de emociones ...
  return {
    // Resultados del análisis
  };
};

// Método auxiliar para obtener insights recientes
userProgressSchema.methods.getRecentInsights = function(entries) {
  return entries
    .reduce((insights, entry) => [...insights, ...entry.insights], [])
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
};

const UserProgress = mongoose.models.UserProgress || mongoose.model('UserProgress', userProgressSchema);

export default UserProgress; 