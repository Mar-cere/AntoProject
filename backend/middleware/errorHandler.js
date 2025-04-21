export const errorHandler = (err, req, res, next) => {
  console.error('Error en la aplicación:', err);

  // Errores de MongoDB
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Error de validación',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(400).json({
      message: 'Error de duplicación',
      error: err.message
    });
  }

  // Errores de OpenAI
  if (err.name === 'OpenAIError') {
    return res.status(503).json({
      message: 'Error en el servicio de IA',
      error: err.message
    });
  }

  // Error por defecto
  return res.status(500).json({
    message: 'Error interno del servidor',
    error: err.message
  });
}; 