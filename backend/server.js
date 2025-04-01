import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import taskRoutes from './routes/taskRoutes.js';
import habitRoutes from './routes/habitRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { setupSocketIO } from './config/socket.js';
import { setupMailer } from './config/mailer.js';
import helmet from 'helmet';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configuración de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:19006'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware de seguridad
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

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

// Configuración de MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}).then(() => {
  console.log('✅ Conectado a MongoDB');
}).catch(err => {
  console.error('❌ Error conectando a MongoDB:', err);
  process.exit(1);
});

// Eventos de MongoDB
mongoose.connection.on('error', err => {
  console.error('Error de MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('Desconectado de MongoDB');
});

// Configurar Socket.IO y Mailer
const io = setupSocketIO(server);
const transporter = setupMailer();

// Verificar configuración del mailer
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Error en la configuración del servidor de correo:', error);
  } else {
    console.log('✅ Servidor de correo listo');
  }
});

// Ruta no encontrada
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// Middleware de errores
const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
};

app.use(errorHandler);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT} en modo ${process.env.NODE_ENV}`);
});

// Manejo de cierre graceful
const gracefulShutdown = () => {
  console.log('🔄 Iniciando cierre graceful...');
  server.close(() => {
    console.log('✅ Servidor HTTP cerrado');
    mongoose.connection.close(false, () => {
      console.log('✅ Conexión MongoDB cerrada');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);