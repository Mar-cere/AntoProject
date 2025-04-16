/**
 * Lista de emociones para mostrar en el banner de emergencia
 * Estas frases se muestran de forma aleatoria en la pantalla de inicio
 * y pueden ser utilizadas en otras partes de la aplicación
 */
export const emotions = [
  "¿Ansiedad?",
  "¿Estrés?",
  "¿Confusión?",
  "¿Soledad?",
  "¿Desesperanza?",
  "¿Miedo?",
  "¿Angustia?",
  "¿Frustración?",
  "¿Agobio?",
  "¿Preocupación?",
  "¿Inseguridad?",
  "¿Desmotivación?",
  "¿Abrumado?",
  "¿Crisis?",
  "¿Pánico?",
  "¿Desorientación?",
  "¿Desánimo?",
  "¿Inquietud?",
  "¿Dificultad?",
];

/**
 * Categorías de emociones para uso en análisis o filtrado
 */
export const emotionCategories = {
  ansiedad: ["¿Ansiedad?", "¿Preocupación?", "¿Pánico?", "¿Inquietud?"],
  tristeza: ["¿Soledad?", "¿Desesperanza?", "¿Desánimo?"],
  estres: ["¿Estrés?", "¿Agobio?", "¿Abrumado?", "¿Frustración?"],
  miedo: ["¿Miedo?", "¿Angustia?", "¿Crisis?", "¿Inseguridad?"],
  confusion: ["¿Confusión?", "¿Desorientación?", "¿Dificultad?", "¿Desmotivación?"]
};

/**
 * Obtiene una emoción aleatoria de la lista
 * @returns {string} Una emoción aleatoria
 */
export const getRandomEmotion = () => {
  const randomIndex = Math.floor(Math.random() * emotions.length);
  return emotions[randomIndex];
};

/**
 * Obtiene una emoción aleatoria de una categoría específica
 * @param {string} category - La categoría de emoción (ansiedad, tristeza, etc.)
 * @returns {string} Una emoción aleatoria de la categoría especificada
 */
export const getRandomEmotionByCategory = (category) => {
  if (!emotionCategories[category]) {
    return getRandomEmotion();
  }
  
  const categoryEmotions = emotionCategories[category];
  const randomIndex = Math.floor(Math.random() * categoryEmotions.length);
  return categoryEmotions[randomIndex];
};

export default emotions;
