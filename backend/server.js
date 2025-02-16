import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

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

// Ruta protegida de historial de chat
app.get('/api/chat/history', authenticateToken, async (req, res) => {
  try {
    const messages = await Message.find({ userId: req.user.userId });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el historial' });
  }
});

// WebSockets para chat en tiempo real
io.on('connection', (socket) => {
  console.log('🟢 Usuario conectado:', socket.id);
  
  socket.on('message', async ({ userId, text }) => {
    const userMessage = new Message({ userId, text, sender: 'user' });
    await userMessage.save();

    // Aquí se integrará OpenAI
    const aiResponse = `Simulación de respuesta para: ${text}`;
    const aiMessage = new Message({ userId, text: aiResponse, sender: 'ai' });
    await aiMessage.save();

    io.emit('message', aiMessage);
  });

  socket.on('disconnect', () => {
    console.log('🔴 Usuario desconectado:', socket.id);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));

