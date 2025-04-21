export const validateMessage = (req, res, next) => {
  const { content, conversationId } = req.body;

  const errors = [];

  if (!content?.trim()) {
    errors.push('El contenido del mensaje es requerido');
  }

  if (!conversationId) {
    errors.push('El ID de conversación es requerido');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      message: 'Error de validación',
      errors
    });
  }

  next();
}; 