const checkServerStatus = (retries = 3) => {
  return new Promise((resolve, reject) => {
    const API_URL = 'https://antobackend.onrender.com';
    let currentTry = 0;

    const tryConnection = () => {
      console.log(`Intento ${currentTry + 1} de ${retries} para verificar el servidor...`);
      
      const xhr = new XMLHttpRequest();
      xhr.timeout = 10000; // 10 segundos

      xhr.onload = function() {
        if (xhr.status === 200) {
          console.log('Estado del servidor:', xhr.responseText);
          resolve(true);
        } else {
          handleError();
        }
      };

      xhr.onerror = handleError;
      xhr.ontimeout = handleError;

      function handleError() {
        console.log(`Intento ${currentTry + 1} falló`);
        currentTry++;
        if (currentTry < retries) {
          setTimeout(tryConnection, 2000);
        } else {
          resolve(false);
        }
      }

      xhr.open('GET', `${API_URL}/health`);
      xhr.send();
    };

    tryConnection();
  });
};

export { checkServerStatus }; 