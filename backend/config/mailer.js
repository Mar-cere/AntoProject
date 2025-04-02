import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });
};

// Plantillas de correo
const emailTemplates = {
  verificationCode: (code) => ({
    subject: 'Código de Verificación - AntoApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verificación de Cuenta</h2>
        <p>Tu código de verificación es:</p>
        <h1 style="color: #4CAF50; font-size: 32px; text-align: center; padding: 20px;">
          ${code}
        </h1>
        <p>Este código expirará en 10 minutos.</p>
        <p>Si no solicitaste este código, por favor ignora este correo.</p>
      </div>
    `
  }),

  resetPassword: (token) => ({
    subject: 'Restablecer Contraseña - AntoApp',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Restablecer Contraseña</h2>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}"
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Restablecer Contraseña
          </a>
        </div>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste restablecer tu contraseña, por favor ignora este correo.</p>
      </div>
    `
  }),

  welcomeEmail: (username) => ({
    subject: '¡Bienvenido a AntoApp! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background-color: #1D2B5F; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="color: #1ADDDB; text-align: center; margin: 0;">¡Bienvenido a AntoApp, ${username}! 🎉</h1>
        </div>
        
        <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; line-height: 1.5; color: #333;">
            ¡Gracias por unirte a nuestra comunidad! Estamos emocionados de tenerte con nosotros.
          </p>
          
          <h2 style="color: #1D2B5F; margin-top: 20px;">Con AntoApp podrás:</h2>
          <ul style="color: #333; font-size: 16px; line-height: 1.5;">
            <li>Organizar tus tareas diarias de forma eficiente ✅</li>
            <li>Desarrollar hábitos positivos para tu crecimiento personal 🌱</li>
            <li>Interactuar con nuestro asistente AI para maximizar tu productividad ��</li>
            <li>Hacer seguimiento de tu progreso con estadísticas detalladas 📊</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.5; color: #333; margin-top: 20px;">
            ¿Listo para comenzar? Aquí hay algunos consejos para empezar:
          </p>
          <ol style="color: #333; font-size: 16px; line-height: 1.5;">
            <li>Configura tu perfil personal</li>
            <li>Crea tu primera tarea</li>
            <li>Establece un hábito que quieras desarrollar</li>
            <li>Explora las funcionalidades de nuestro asistente AI</li>
          </ol>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Si tienes alguna pregunta o sugerencia, no dudes en contactarnos.
              ¡Estamos aquí para ayudarte en tu camino hacia una mejor organización y productividad!
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
          <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
        </div>
      </div>
    `
  })
};

// Funciones de envío de correo
const mailer = {
  // Enviar código de verificación
  sendVerificationCode: async (email, code) => {
    try {
      const transporter = createTransporter();
      const template = emailTemplates.verificationCode(code);
      
      await transporter.sendMail({
        from: `"AntoApp" <${process.env.EMAIL_USER}>`,
        to: email,
        ...template
      });
      
      console.log('✉️ Código de verificación enviado a:', email);
      return true;
    } catch (error) {
      console.error('Error al enviar código de verificación:', error);
      throw new Error('Error al enviar el correo de verificación');
    }
  },

  // Enviar correo de restablecimiento de contraseña
  sendPasswordReset: async (email, token) => {
    try {
      const transporter = createTransporter();
      const template = emailTemplates.resetPassword(token);
      
      await transporter.sendMail({
        from: `"AntoApp" <${process.env.EMAIL_USER}>`,
        to: email,
        ...template
      });
      
      console.log('✉️ Correo de restablecimiento enviado a:', email);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de restablecimiento:', error);
      throw new Error('Error al enviar el correo de restablecimiento');
    }
  },

  // Enviar correo de bienvenida
  sendWelcomeEmail: async (email, username) => {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"AntoApp" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '¡Bienvenido a AntoApp! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #1D2B5F; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <h1 style="color: #1ADDDB; text-align: center; margin: 0;">¡Bienvenido a AntoApp, ${username}! 🎉</h1>
            </div>
            
            <div style="background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <p style="font-size: 16px; line-height: 1.5; color: #333;">
                ¡Gracias por unirte a nuestra comunidad! Estamos emocionados de tenerte con nosotros.
              </p>
              
              <h2 style="color: #1D2B5F; margin-top: 20px;">Con AntoApp podrás:</h2>
              <ul style="color: #333; font-size: 16px; line-height: 1.5;">
                <li>Organizar tus tareas diarias de forma eficiente ✅</li>
                <li>Desarrollar hábitos positivos para tu crecimiento personal 🌱</li>
                <li>Interactuar con nuestro asistente AI para maximizar tu productividad 🤖</li>
                <li>Hacer seguimiento de tu progreso con estadísticas detalladas 📊</li>
              </ul>

              <p style="font-size: 16px; line-height: 1.5; color: #333; margin-top: 20px;">
                ¿Listo para comenzar? Aquí hay algunos consejos para empezar:
              </p>
              <ol style="color: #333; font-size: 16px; line-height: 1.5;">
                <li>Configura tu perfil personal</li>
                <li>Crea tu primera tarea</li>
                <li>Establece un hábito que quieras desarrollar</li>
                <li>Explora las funcionalidades de nuestro asistente AI</li>
              </ol>

              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 14px;">
                  Si tienes alguna pregunta o sugerencia, no dudes en contactarnos.
                  ¡Estamos aquí para ayudarte en tu camino hacia una mejor organización y productividad!
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #666; font-size: 12px;">
              <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        `
      });
      console.log('✉️ Correo de bienvenida enviado a:', email);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de bienvenida:', error);
      // No lanzamos el error para que no afecte el flujo de registro
      return false;
    }
  }
};

export default mailer;