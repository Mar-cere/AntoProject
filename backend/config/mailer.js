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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f3f7fa;">
        <!-- Encabezado con gradiente oscuro y logo -->
        <div style="background: linear-gradient(135deg, #0A1533 0%, #1D2B5F 60%, #1ADDDB 100%); padding: 36px 0 24px 0; border-radius: 0 0 32px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); text-align: center;">
          <img src="https://res.cloudinary.com/dfmmn3hqw/image/upload/v1746325071/Anto_nnrwjr.png" alt="AntoApp Logo" style="width: 64px; height: 64px; margin-bottom: 12px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.10);" />
          <h1 style="color: #fff; margin: 0; font-size: 2.2rem; font-weight: 700; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            Código de Verificación
          </h1>
        </div>

        <!-- Contenedor principal con efecto glassmorphism -->
        <div style="background: rgba(20, 28, 56, 0.92); backdrop-filter: blur(12px); margin: -24px 24px 24px 24px; padding: 32px 24px; border-radius: 18px; box-shadow: 0 8px 32px rgba(31,38,135,0.10); border: 1px solid rgba(255,255,255,0.10);">
          <p style="color: #fff; font-size: 1.1rem; line-height: 1.7; margin-bottom: 28px; text-align: center;">
            ¡Hola!<br>
            Tu código de verificación para recuperar tu contraseña es:
          </p>

          <!-- Código con estilo moderno -->
          <div style="background: linear-gradient(135deg, #1D2B5F 0%, #1ADDDB 100%); padding: 4px; border-radius: 14px; margin: 32px 0;">
            <div style="background: white; padding: 24px 0; border-radius: 12px;">
              <span style="display: block; color: #1D2B5F; font-size: 2.5rem; text-align: center; letter-spacing: 12px; font-weight: bold; font-family: 'Segoe UI Mono', 'Menlo', 'Monaco', monospace;">
                ${code}
              </span>
            </div>
          </div>

          <div style="margin-top: 24px; text-align: center;">
            <p style="color: #A3B8E8; font-size: 1rem; margin-bottom: 8px;">
              Este código expirará en <span style="color: #1ADDDB; font-weight: bold;">10 minutos</span>.
            </p>
            <p style="color: #A3B8E8; font-size: 0.95rem;">
              Si no solicitaste este código, puedes ignorar este correo.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin: 0 24px 24px 24px;">
          <p style="color: #A3B8E8; font-size: 0.95rem; margin: 0;">
            Este es un correo automático, por favor no respondas a este mensaje.<br>
            © ${new Date().getFullYear()} <span style="color: #1ADDDB;">AntoApp</span>. Todos los derechos reservados.
          </p>
        </div>
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
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f3f7fa;">
        <!-- Encabezado con gradiente oscuro y logo -->
        <div style="background: linear-gradient(135deg, #0A1533 0%, #1D2B5F 60%, #1ADDDB 100%); padding: 36px 0 24px 0; border-radius: 0 0 32px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); text-align: center;">
          <img src="https://res.cloudinary.com/dfmmn3hqw/image/upload/v1746325071/Anto_nnrwjr.png" alt="AntoApp Logo" style="width: 64px; height: 64px; margin-bottom: 12px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.10);" />
          <h1 style="color: #fff; margin: 0; font-size: 2.2rem; font-weight: 700; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.15);">
            ¡Bienvenido a AntoApp, ${username}! 🎉
          </h1>
        </div>

        <!-- Contenedor principal con efecto glassmorphism -->
        <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); margin: -24px 24px 24px 24px; padding: 32px 24px; border-radius: 18px; box-shadow: 0 8px 32px rgba(31,38,135,0.10); border: 1px solid rgba(255,255,255,0.18);">
          <p style="color: #1D2B5F; font-size: 1.1rem; line-height: 1.7; margin-bottom: 28px; text-align: center;">
            ¡Gracias por unirte a nuestra comunidad! Estamos emocionados de tenerte con nosotros.
          </p>
          
          <h2 style="color: #1ADDDB; margin-top: 20px; text-align: center;">Con AntoApp podrás:</h2>
          <ul style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            <li>Organizar tus tareas diarias de forma eficiente ✅</li>
            <li>Desarrollar hábitos positivos para tu crecimiento personal 🌱</li>
            <li>Interactuar con nuestro asistente AI para maximizar tu productividad 🤖</li>
            <li>Hacer seguimiento de tu progreso con estadísticas detalladas 📊</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.5; color: #1D2B5F; margin-top: 20px; text-align: center;">
            ¿Listo para comenzar? Aquí hay algunos consejos para empezar:
          </p>
          <ol style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
            <li>Configura tu perfil personal</li>
            <li>Crea tu primera tarea</li>
            <li>Establece un hábito que quieras desarrollar</li>
            <li>Explora las funcionalidades de nuestro asistente AI</li>
          </ol>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666; font-size: 14px;">
              Si tienes alguna pregunta o sugerencia, no dudes en contactarnos.<br>
              ¡Estamos aquí para ayudarte en tu camino hacia una mejor organización y productividad!
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin: 0 24px 24px 24px;">
          <p style="color: #A3B8E8; font-size: 0.95rem; margin: 0;">
            Este es un correo automático, por favor no respondas a este mensaje.<br>
            © ${new Date().getFullYear()} <span style="color: #1ADDDB;">AntoApp</span>. Todos los derechos reservados.
          </p>
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
        from: `"Anto" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '¡Bienvenido a Anto! 🎉',
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f3f7fa;">
            <!-- Encabezado con gradiente oscuro y logo -->
            <div style="background: linear-gradient(135deg, #0A1533 0%, #1D2B5F 60%, #1ADDDB 100%); padding: 36px 0 24px 0; border-radius: 0 0 32px 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.10); text-align: center;">
              <img src="https://res.cloudinary.com/dfmmn3hqw/image/upload/v1746325071/Anto_nnrwjr.png" alt="Anto Logo" style="width: 64px; height: 64px; margin-bottom: 12px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.10);" />
              <h1 style="color: #fff; margin: 0; font-size: 2.2rem; font-weight: 700; letter-spacing: 1px; text-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                ¡Bienvenido a Anto, ${username}! 🎉
              </h1>
            </div>

            <!-- Contenedor principal con efecto glassmorphism -->
            <div style="background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); margin: -24px 24px 24px 24px; padding: 32px 24px; border-radius: 18px; box-shadow: 0 8px 32px rgba(31,38,135,0.10); border: 1px solid rgba(255,255,255,0.18);">
              <p style="color: #1D2B5F; font-size: 1.1rem; line-height: 1.7; margin-bottom: 28px; text-align: center;">
                ¡Gracias por unirte a nuestra comunidad! Anto es tu espacio seguro para conversar con una IA entrenada como psicólogo virtual, lista para escucharte y acompañarte en tu bienestar emocional.
              </p>
              
              <h2 style="color: #1ADDDB; margin-top: 20px; text-align: center;">¿Cómo aprovechar al máximo el chat con Anto?</h2>
              <ul style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                <li><b>Exprésate libremente:</b> Cuéntale a Anto cómo te sientes, tus preocupaciones, logros o dudas. No hay juicios, solo escucha y acompañamiento.</li>
                <li><b>Haz preguntas abiertas:</b> Si buscas reflexión, pide a Anto que te ayude a ver diferentes perspectivas o a profundizar en tus emociones.</li>
                <li><b>Utiliza el chat en momentos de estrés o ansiedad:</b> Anto puede guiarte con ejercicios de respiración, mindfulness o ayudarte a organizar tus pensamientos.</li>
                <li><b>Revisa tus conversaciones:</b> Volver a leer lo que has compartido puede ayudarte a identificar patrones y avances en tu bienestar.</li>
                <li><b>Recuerda:</b> Anto no reemplaza a un profesional humano, pero es un gran apoyo para tu día a día emocional.</li>
              </ul>

              <h2 style="color: #1ADDDB; margin-top: 20px; text-align: center;">Tips para un mejor beneficio:</h2>
              <ol style="color: #333; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                <li>Habla con Anto de forma regular, incluso si no tienes un problema específico.</li>
                <li>Prueba escribir tus emociones tal como las sientes, sin filtros.</li>
                <li>Pide a Anto ejercicios de relajación o autoexploración cuando lo necesites.</li>
                <li>Utiliza los recordatorios, hábitos y tareas como complemento para tu bienestar, pero recuerda que el corazón de Anto es el chat.</li>
              </ol>

              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #666; font-size: 14px;">
                  Si tienes alguna pregunta o sugerencia, no dudes en contactarnos.<br>
                  ¡Estamos aquí para acompañarte en tu camino hacia una mejor salud emocional!
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; margin: 0 24px 24px 24px;">
              <p style="color: #A3B8E8; font-size: 0.95rem; margin: 0;">
                Este es un correo automático, por favor no respondas a este mensaje.<br>
                © ${new Date().getFullYear()} <span style="color: #1ADDDB;">Anto</span>. Todos los derechos reservados.
              </p>
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