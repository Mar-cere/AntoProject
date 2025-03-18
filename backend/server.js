import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import openaiService from '../src/services/openaiService.js';

// Configuración de variables de entorno
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error en conexión a MongoDB:', err));

// Modelo de usuario
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});
const User = mongoose.model('User', UserSchema);

// Modelo de mensajes
const MessageSchema = new mongoose.Schema({
  userId: String,
  text: String,
  sender: String, // 'user' o 'ai'
  createdAt: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', MessageSchema);

// Registro de usuario
app.post('/api/users/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el registro' });
  }
});

// Inicio de sesión
app.post('/api/users/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user._id, name: user.name });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión' });
  }
});

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(403).json({ message: 'Acceso denegado' });

  jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = decoded;
    next();
  });
};

// Endpoint para establecer nueva contraseña
app.post('/api/users/reset-password', async (req, res) => {
  try {
    const { token, email, password } = req.body;
    
    // Buscar usuario con el token y email proporcionados
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'El token de restablecimiento es inválido o ha expirado' });
    }
    
    // Actualizar contraseña
    user.password = password; // Asumiendo que tienes un hook para hashear la contraseña
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Configuración del transporter de correo
const transporter = nodemailer.createTransport({
  service: 'gmail', // o cualquier otro servicio
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Endpoint para solicitar restablecimiento
app.post('/api/users/recover', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Buscar usuario en la base de datos
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con este correo' });
    }
    
    // Generar token único
    const token = crypto.randomBytes(20).toString('hex');
    
    // Guardar token en la base de datos con tiempo de expiración
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();
    
    // URL para restablecer contraseña (usando deeplink para apps móviles)
    const resetUrl = `yourapp://resetpassword?token=${token}&email=${email}`;
    
    // Configuración del correo
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Restablecimiento de contraseña',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1ADDDB;">Restablecimiento de contraseña</h1>
          <p>Has solicitado restablecer tu contraseña.</p>
          <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
          <a href="${resetUrl}" style="background-color: #1ADDDB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0;">Restablecer contraseña</a>
          <p>Si no has solicitado este cambio, puedes ignorar este correo.</p>
          <p>Este enlace expirará en 1 hora.</p>
        </div>
      `
    };
    
    // Enviar correo
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Se ha enviado un correo con instrucciones para restablecer tu contraseña' });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});


// Ruta protegida de historial de chat
app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el historial' });
  }
});

// Endpoint para generar respuestas de OpenAI (sin autenticación)
app.post('/api/chat/generate', async (req, res) => {
  try {
    const { text } = req.body;
    // Usar un ID de usuario genérico para pruebas
    const userId = 'usuario_prueba';
    
    // Guardar mensaje del usuario
    const userMessage = new Message({ userId, text, sender: 'user' });
    await userMessage.save();
    
    // Obtener mensajes recientes para contexto (últimos 10)
    const recentMessages = await Message.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .sort({ createdAt: 1 });
    
    // Formatear mensajes para OpenAI
    const formattedMessages = formatMessagesForOpenAI(userId, recentMessages);
    
    // Generar respuesta con OpenAI
    const aiResponse = await openaiService.generateAIResponse(formattedMessages);
    
    // Guardar respuesta de la IA
    const aiMessage = new Message({ 
      userId, 
      text: aiResponse.text, 
      sender: 'ai' 
    });
    await aiMessage.save();
    
    // Enviar respuesta al cliente
    res.json(aiMessage);
  } catch (error) {
    console.error('Error al generar respuesta:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// WebSockets para chat en tiempo real
io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);
  
  // Almacenar el ID del usuario asociado a este socket
  let currentUserId = null;
  
  // Autenticación del socket
  socket.on('authenticate', ({ userId }) => {
    currentUserId = userId || 'usuario_prueba';
    console.log(`Socket ${socket.id} autenticado como usuario ${currentUserId}`);
  });
  
  // Recibir mensaje del usuario
  socket.on('message', async ({ text }) => {
    console.log(`Mensaje recibido de ${socket.id}:`, text);
    
    if (!currentUserId) {
      console.log('Usuario no autenticado, usando ID por defecto');
      currentUserId = 'usuario_prueba';
    }
    
    try {
      // Crear objeto de mensaje
      const userMessage = { 
        _id: new Date().getTime().toString(),
        userId: currentUserId, 
        text, 
        sender: 'user',
        createdAt: new Date()
      };
      
      console.log('Mensaje formateado:', userMessage);
      
      // Guardar mensaje en BD (si es posible)
      try {
        const savedMessage = new Message(userMessage);
        await savedMessage.save();
        console.log('Mensaje guardado en BD');
      } catch (dbError) {
        console.error('Error al guardar en BD, continuando:', dbError);
      }
      
      // Emitir mensaje de vuelta al cliente
      console.log('Emitiendo message:sent al cliente');
      socket.emit('message:sent', userMessage);
      
      // Indicar que la IA está escribiendo
      console.log('Emitiendo ai:typing (true) al cliente');
      socket.emit('ai:typing', true);
      
      // Simular respuesta de la IA (para pruebas)
      setTimeout(() => {
        const aiMessage = {
          _id: new Date().getTime().toString() + '-ai',
          userId: currentUserId,
          text: `Respuesta a: "${text}"`,
          sender: 'ai',
          createdAt: new Date()
        };
        
        console.log('Emitiendo ai:typing (false) al cliente');
        socket.emit('ai:typing', false);
        
        console.log('Emitiendo message:received al cliente');
        socket.emit('message:received', aiMessage);
        
        // Guardar respuesta en BD
        try {
          const savedAiMessage = new Message(aiMessage);
          savedAiMessage.save();
        } catch (dbError) {
          console.error('Error al guardar respuesta en BD:', dbError);
        }
      }, 2000);
    } catch (error) {
      console.error('Error al procesar mensaje:', error);
      socket.emit('error', { message: 'Error al procesar mensaje' });
      socket.emit('ai:typing', false);
    }
  });
  
  // Cancelar generación de respuesta
  socket.on('cancel:response', () => {
    // Aquí implementarías la lógica para cancelar la generación
    // (esto requeriría modificaciones adicionales en la función generateAIResponse)
    socket.emit('ai:typing', false);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuario desconectado:', socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));