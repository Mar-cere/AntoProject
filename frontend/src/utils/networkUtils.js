const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const checkServerStatus = async (maxRetries = 3) => {
  const API_URL = 'https://antobackend.onrender.com';
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Intento ${attempt + 1} de ${maxRetries} para verificar el servidor...`);
      
      // Tiempo de espera exponencial: 2^attempt segundos (2, 4, 8 segundos)
      if (attempt > 0) {
        const backoffTime = Math.min(1000 * Math.pow(2, attempt), 8000);
        console.log(`Esperando ${backoffTime/1000} segundos antes del siguiente intento...`);
        await wait(backoffTime);
      }

      const response = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Servidor respondió exitosamente:', data);
        return true;
      }
    } catch (error) {
      console.log(`Intento ${attempt + 1} falló:`, error.message);
      
      // Si es el último intento, informamos del fallo
      if (attempt === maxRetries - 1) {
        console.error('No se pudo establecer conexión con el servidor después de', maxRetries, 'intentos');
        return false;
      }
    }
  }
  return false;
};

export { checkServerStatus }; 