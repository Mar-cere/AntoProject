import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import taskRoutes from './routes/taskRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { setupSocketIO } from './config/socket.js';
import mailer from './config/mailer.js';
import helmet from 'helmet';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuración de CORS más permisiva
const corsOptions = {
  origin: '*', // Permite todas las conexiones en desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Middleware de seguridad con configuración más permisiva para desarrollo
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Middlewares básicos
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Rate limiting más permisivo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // Aumentado a 1000 peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intente de nuevo más tarde'
});

// Health check antes de rate limiting
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Aplicar rate limiting solo a rutas específicas
app.use('/api/auth/', limiter);

// Rutas
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Validación de variables de entorno
const requiredEnvVars = [
  'MONGO_URI',
  'JWT_SECRET',
  'PORT'
];

const optionalEnvVars = [
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'OPENAI_API_KEY',
  'FRONTEND_URL',
  'NODE_ENV'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Error: ${varName} no está definida`);
    process.exit(1);
  }
});

optionalEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.warn(`⚠️ Advertencia: ${varName} no está definida`);
  }
});

// Configuración de MongoDB con retry
const connectMongoDB = async (retries = 5) => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Conectado a MongoDB');
  } catch (err) {
    if (retries > 0) {
      console.log(`Reintentando conexión... (${retries} intentos restantes)`);
      setTimeout(() => connectMongoDB(retries - 1), 5000);
    } else {
      console.error('❌ Error conectando a MongoDB:', err);
      process.exit(1);
    }
  }
};

connectMongoDB();

// Manejo de errores mejorado
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT} en modo ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de cierre graceful
const gracefulShutdown = async (signal) => {
  console.log(`🔄 Iniciando cierre graceful por señal ${signal}...`);
  
  try {
    await server.close();
    console.log('✅ Servidor HTTP cerrado');
    
    await mongoose.connection.close();
    console.log('✅ Conexión MongoDB cerrada');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el cierre:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));