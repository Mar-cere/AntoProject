/**
 * Servidor principal de la aplicación
 * 
 * Este archivo configura y ejecuta el servidor Express, estableciendo
 * middlewares, rutas y conexión a la base de datos.
 * 
 * @version 1.2.0
 * @author AntoApp Team
 */

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

// Importación de rutas
import taskRoutes from './routes/taskRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import achievementRoutes from './routes/achievementRoutes.js';
import journalRoutes from './routes/journalRoutes.js';

// Configuración de variables de entorno
dotenv.config();

// Inicialización de la aplicación
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de seguridad básica
app.use(helmet());

// Configuración de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Límite de solicitudes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // límite de 100 solicitudes por ventana
});
app.use(limiter);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Conexión exitosa a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// Rutas de la API
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/journal', journalRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    services: {
      tasks: 'active',
      habits: 'active',
      users: 'active',
      auth: 'active',
      chat: 'active',
      achievements: 'active',
      journal: 'active'
    },
    version: '1.2.0'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📝 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 URL Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  console.log('👋 Recibida señal SIGTERM. Cerrando servidor...');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 Recibida señal SIGINT. Cerrando servidor...');
  mongoose.connection.close();
  process.exit(0);
});

export default app;