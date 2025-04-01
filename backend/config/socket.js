import { Server } from 'socket.io';

export const setupSocketIO = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:19006'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware de autenticación para sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Autenticación requerida'));
    }
    // Aquí puedes verificar el token si lo necesitas
    next();
  });

  // Manejo de eventos de conexión
  io.on('connection', (socket) => {
    console.log('🟢 Usuario conectado:', socket.id);
    
    let currentUserId = null;
    
    // Autenticación del socket
    socket.on('authenticate', ({ userId }) => {
      currentUserId = userId;
      console.log(`Socket ${socket.id} autenticado como usuario ${currentUserId}`);
      socket.join(userId); // Unir al socket a una sala específica del usuario
    });
    
    // Manejo de mensajes
    socket.on('message', async (data) => {
      try {
        if (!currentUserId) {
          throw new Error('Usuario no autenticado');
        }
        
        // Emitir estado de escritura
        socket.emit('ai:typing', true);
        
        // Emitir el mensaje recibido de vuelta al cliente
        socket.emit('message:sent', {
          ...data,
          userId: currentUserId,
          timestamp: new Date()
        });
        
        // Aquí puedes agregar la lógica para procesar el mensaje
        // Por ejemplo, guardar en la base de datos o generar respuesta AI
        
        // Simular respuesta después de un delay
        setTimeout(() => {
          socket.emit('ai:typing', false);
          socket.emit('message:received', {
            userId: currentUserId,
            text: `Respuesta al mensaje: "${data.text}"`,
            timestamp: new Date()
          });
        }, 1000);
        
      } catch (error) {
        console.error('Error en el manejo del mensaje:', error);
        socket.emit('error', { message: error.message });
      }
    });
    
    // Cancelar respuesta
    socket.on('cancel:response', () => {
      socket.emit('ai:typing', false);
    });
    
    // Manejo de desconexión
    socket.on('disconnect', () => {
      console.log('🔴 Usuario desconectado:', socket.id);
      if (currentUserId) {
        socket.leave(currentUserId);
      }
    });
  });

  return io;
};
