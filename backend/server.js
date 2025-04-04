import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de seguridad con configuración más permisiva para desarrollo
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// Middlewares básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger solo en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
// Health check endpoint (antes de cualquier otra ruta)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});


// Rutas
app.use('/api/tasks', taskRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Añade esto después de la configuración de express
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

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

// Configuración de MongoDB
const connectDB = async (retries = 5) => {
  try {
    console.log('📡 Intentando conectar a MongoDB...');
    
    const mongoOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      maxPoolSize: 10
    };

    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ Conectado a MongoDB exitosamente');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error);
    
    if (retries > 0) {
      console.log(`🔄 Reintentando conexión... (${retries} intentos restantes)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    }
    
    return false;
  }
};

// Manejo de errores de MongoDB
mongoose.connection.on('error', (err) => {
  console.error('Error de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB desconectado - intentando reconectar...');
  connectDB();
});

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
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
const startServer = async () => {
  const isConnected = await connectDB();
  
  if (!isConnected) {
    console.error('❌ No se pudo conectar a MongoDB después de varios intentos');
    process.exit(1);
  }

  app.listen(process.env.PORT || 5001, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${process.env.PORT || 5001}`);
    console.log(`🌍 Ambiente: ${process.env.NODE_ENV}`);
  });
};

startServer();

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido. Cerrando servidor...');
  await mongoose.connection.close();
  process.exit(0);
});