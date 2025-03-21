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
import openaiService from './services/openaiService.js';
import User from './models/UserSchema.js';

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
  try {
    const { username, email, password } = req.body;
    
    // Validación
    if (!username || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nombre de usuario, correo y contraseña son obligatorios' 
      });
    }
    
    // Verificar si ya existe un usuario con ese email
    let existingUserEmail;
    try {
      existingUserEmail = await User.findOne({ email: email.toLowerCase().trim() });
    } catch (dbError) {
      console.error('Error al buscar usuario por email:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor al verificar el correo'
      });
    }
    
    if (existingUserEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'Este correo ya está registrado' 
      });
    }
    
    // Verificar si ya existe un usuario con ese username
    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase().trim() });
      if (existingUsername) {
        return res.status(400).json({ 
          success: false, 
          message: 'Este nombre de usuario ya está en uso' 
        });
      }
    }
    
    // Crear usuario con datos normalizados y generar ID único
    const newUser = new User({
      id: `user_${new Date().getTime().toString(36)}_${Math.random().toString(36).substring(2, 10)}`,
      username: username.toLowerCase().trim(),
      name: username.toLowerCase().trim(), // Usamos el username como nombre provisional
      email: email.toLowerCase().trim(),
      password: password, // Mongoose lo hasheará automáticamente
      createdAt: new Date().toISOString()
    });
    
    // Guardar en la base de datos
    await newUser.save();
    
    // Respuesta exitosa
    res.status(201).json({ 
      success: true, 
      message: 'Usuario registrado exitosamente',
      userId: newUser.id,
      username: newUser.username
    });
  } catch (error) {
    console.error('Error en el registro:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el proceso de registro: ' + error.message
    });
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

// Endpoint para solicitar restablecimiento con código - con correo mejorado
app.post('/api/users/recover', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Buscar usuario en la base de datos
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con este correo' });
    }
    
    // Generar código numérico aleatorio de 6 dígitos
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Guardar código en la base de datos con tiempo de expiración
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save();
    
    // Obtener nombre de usuario para personalizar correo
    const userName = user.name || 'Usuario';
    
    // Configuración del correo con código y diseño mejorado
    const mailOptions = {
      from: `"AntoApp" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Código de recuperación de contraseña',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperación de contraseña</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
            
            body {
              font-family: 'Poppins', Arial, sans-serif;
              line-height: 1.6;
              color: #333333;
              margin: 0;
              padding: 0;
              background-color: #f9f9f9;
            }
            
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            
            .header {
              text-align: center;
              padding: 25px 0;
              background: linear-gradient(135deg, #030A24 0%, #1D2B5F 100%);
              border-radius: 10px 10px 0 0;
            }
            
            .logo {
              width: 150px;
              height: auto;
            }
            
            .content {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            }
            
            h1 {
              color: #1ADDDB;
              margin-top: 0;
              margin-bottom: 20px;
              font-size: 24px;
              font-weight: 600;
            }
            
            p {
              margin-bottom: 20px;
              color: #666666;
              font-size: 16px;
            }
            
            .code-container {
              background-color: #f2f2f2;
              border-radius: 10px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            
            .code {
              font-size: 32px;
              font-weight: 700;
              color: #030A24;
              letter-spacing: 8px;
              margin: 0;
            }
            
            .note {
              font-size: 14px;
              color: #999999;
              margin-top: 30px;
            }
            
            .footer {
              text-align: center;
              padding: 20px;
              font-size: 12px;
              color: #999999;
            }
            
            .highlight {
              color: #1ADDDB;
              font-weight: 600;
            }
            
            .divider {
              height: 1px;
              background-color: #eeeeee;
              margin: 25px 0;
            }
            
            @media only screen and (max-width: 600px) {
              .container {
                width: 100%;
                padding: 10px;
              }
              
              .content {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://i.imgur.com/YckJlnz.png" alt="AntoApp Logo" class="logo">
            </div>
            <div class="content">
              <h1>Recuperación de contraseña</h1>
              <p>Hola <span class="highlight">${userName}</span>,</p>
              <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Utiliza el siguiente código de verificación para completar el proceso:</p>
              
              <div class="code-container">
                <h2 class="code">${resetCode}</h2>
              </div>
              
              <p>Si no solicitaste este código, puedes ignorar este correo y tu cuenta seguirá segura.</p>
              
              <div class="divider"></div>
              
              <p class="note">Este código expirará en 60 minutos por motivos de seguridad.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} AntoApp. Todos los derechos reservados.</p>
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    // Enviar correo
    await transporter.sendMail(mailOptions);
    
    res.json({ 
      message: 'Se ha enviado un código de verificación a tu correo',
      email: email // Devolver el email para la siguiente pantalla
    });
  } catch (error) {
    console.error('Error en recuperación de contraseña:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud: ' + error.message });
  }
});

// Nuevo endpoint para verificar código antes de restablecer contraseña
app.post('/api/users/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    // Buscar usuario con el código y email proporcionados
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'El código es inválido o ha expirado' });
    }
    
    // Si el código es válido, devolver confirmación
    res.json({ 
      message: 'Código verificado correctamente',
      verified: true
    });
  } catch (error) {
    console.error('Error al verificar código:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Modificar endpoint para restablecer contraseña
app.post('/api/users/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    
    // Buscar usuario con el código y email proporcionados
    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordToken: code,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'El código es inválido o ha expirado' });
    }
    
    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Actualizar contraseña
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    res.status(500).json({ message: 'Error al procesar la solicitud' });
  }
});

// Configuración del transporter de correo con más opciones
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true, // Activa logs para depuración
  logger: true // Muestra logs detallados
});

// Verificar la configuración al iniciar
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Error en la configuración del servidor de correo:', error);
  } else {
    console.log('✅ Servidor de correo listo para enviar mensajes');
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