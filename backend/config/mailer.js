import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const setupMailer = () => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD
    }
  });

  return transporter;
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
    subject: '¡Bienvenido a AntoApp!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">¡Bienvenido ${username}!</h2>
        <p>Gracias por unirte a AntoApp. Estamos emocionados de tenerte con nosotros.</p>
        <p>Con AntoApp podrás:</p>
        <ul>
          <li>Gestionar tus tareas diarias</li>
          <li>Desarrollar hábitos positivos</li>
          <li>Interactuar con nuestro asistente AI</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login"
             style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Comenzar Ahora
          </a>
        </div>
      </div>
    `
  })
};

// Funciones de envío de correo
export const mailer = {
  // Enviar código de verificación
  sendVerificationCode: async (email, code) => {
    try {
      const transporter = setupMailer();
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
      const transporter = setupMailer();
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
      const transporter = setupMailer();
      const template = emailTemplates.welcomeEmail(username);
      
      await transporter.sendMail({
        from: `"AntoApp" <${process.env.EMAIL_USER}>`,
        to: email,
        ...template
      });
      
      console.log('✉️ Correo de bienvenida enviado a:', email);
      return true;
    } catch (error) {
      console.error('Error al enviar correo de bienvenida:', error);
      throw new Error('Error al enviar el correo de bienvenida');
    }
  }
};

export default mailer;