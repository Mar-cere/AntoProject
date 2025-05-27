class EmotionalAnalyzer {
  constructor() {
    this.emotionPatterns = {
      tristeza: {
        patterns: /(?:triste(?:za)?|deprimi(?:do|da)|sin energía|desánimo|desmotiva(?:do|da)|solo|soledad|melancolía|nostalgia)/i,
        intensity: 7,
        category: 'negative'
      },
      ansiedad: {
        patterns: /(?:ansie(?:dad|oso)|nervios|inquiet(?:o|ud)|preocupa(?:do|ción)|angustia|miedo|pánico|estresado)/i,
        intensity: 6,
        category: 'negative'
      },
      enojo: {
        patterns: /(?:enoja(?:do|da)|ira|rabia|molest(?:o|a)|frustrad(?:o|a)|impotencia|indignación|resentimiento)/i,
        intensity: 8,
        category: 'negative'
      },
      alegria: {
        patterns: /(?:feliz|contento|alegr(?:e|ía)|satisfech(?:o|a)|motivad(?:o|a)|entusiasm(?:o|ado)|euforia|júbilo)/i,
        intensity: 7,
        category: 'positive'
      },
      neutral: {
        patterns: /(?:normal|tranquil(?:o|a)|bien|regular|más o menos|asi asi|equilibrado|estable)/i,
        intensity: 4,
        category: 'neutral'
      }
    };
  }

  /**
   * Analiza la emoción principal y secundaria de un mensaje.
   * @param {string} content - Contenido del mensaje.
   * @param {Array} previousPatterns - Historial de análisis previos (opcional).
   * @returns {Promise<Object>} Análisis emocional.
   */
  async analyzeEmotion(content, previousPatterns = []) {
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      console.warn('[EmotionalAnalyzer] Contenido inválido recibido en analyzeEmotion:', content);
      return this.getDefaultAnalysis();
    }

    try {
      const contentLower = content.toLowerCase();
      let detectedEmotion = this.detectPrimaryEmotion(contentLower);
      let intensity = this.calculateIntensity(contentLower, detectedEmotion);
      let secondaryEmotions = this.detectSecondaryEmotions(contentLower, detectedEmotion.name);

      // Ajustar basado en patrones previos si existen
      if (previousPatterns && Array.isArray(previousPatterns) && previousPatterns.length > 0) {
        const adjustedAnalysis = this.adjustBasedOnHistory(
          detectedEmotion,
          intensity,
          previousPatterns
        );
        detectedEmotion = adjustedAnalysis.emotion;
        intensity = adjustedAnalysis.intensity;
      }

      return {
        mainEmotion: detectedEmotion.name,
        intensity: intensity,
        category: detectedEmotion.category,
        secondary: secondaryEmotions,
        confidence: this.calculateConfidence(contentLower, detectedEmotion),
        requiresAttention: this.checkIfRequiresAttention(detectedEmotion, intensity)
      };
    } catch (error) {
      console.error('[EmotionalAnalyzer] Error en análisis emocional:', error, content);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Detecta la emoción principal en el contenido.
   * @param {string} content - Contenido en minúsculas.
   * @returns {Object} Emoción detectada.
   */
  detectPrimaryEmotion(content) {
    if (typeof content !== 'string' || !content.trim()) {
      return {
        name: 'neutral',
        category: 'neutral',
        baseIntensity: 4
      };
    }
    for (const [emotion, data] of Object.entries(this.emotionPatterns)) {
      if (data.patterns.test(content)) {
        return {
          name: emotion,
          category: data.category,
          baseIntensity: data.intensity
        };
      }
    }
    return {
      name: 'neutral',
      category: 'neutral',
      baseIntensity: 4
    };
  }

  /**
   * Calcula la intensidad emocional.
   * @param {string} content - Contenido del mensaje.
   * @param {Object} emotion - Emoción detectada.
   * @returns {number} Intensidad ajustada.
   */
  calculateIntensity(content, emotion) {
    if (typeof content !== 'string' || !emotion) return 4;
    const intensifiers = /(?:muy|mucho|demasiado|extremadamente|totalmente|absolutamente)/i;
    const diminishers = /(?:poco|algo|ligeramente|un poco|apenas)/i;
    let intensity = emotion.baseIntensity;
    if (intensifiers.test(content)) {
      intensity = Math.min(intensity + 2, 10);
    } else if (diminishers.test(content)) {
      intensity = Math.max(intensity - 2, 1);
    }
    if (content.split(' ').length > 20) {
      intensity = Math.min(intensity + 1, 10);
    }
    return intensity;
  }

  /**
   * Detecta emociones secundarias en el contenido.
   * @param {string} content - Contenido del mensaje.
   * @param {string} primaryEmotion - Emoción principal detectada.
   * @returns {Array} Emociones secundarias detectadas.
   */
  detectSecondaryEmotions(content, primaryEmotion) {
    const secondaryEmotions = [];
    if (typeof content !== 'string') return secondaryEmotions;
    for (const [emotion, data] of Object.entries(this.emotionPatterns)) {
      if (emotion !== primaryEmotion && data.patterns.test(content)) {
        secondaryEmotions.push(emotion);
      }
    }
    return secondaryEmotions;
  }

  /**
   * Calcula la confianza del análisis emocional.
   * @param {string} content - Contenido del mensaje.
   * @param {Object} emotion - Emoción detectada.
   * @returns {number} Confianza (0-1).
   */
  calculateConfidence(content, emotion) {
    if (!emotion || typeof content !== 'string') return 0.4;
    const matchStrength = emotion.patterns?.test(content) ? 0.8 : 0.4;
    const contextualClues = this.hasContextualClues(content) ? 0.1 : 0;
    return Math.min(matchStrength + contextualClues, 1);
  }

  /**
   * Verifica si el contenido tiene pistas contextuales de emoción.
   * @param {string} content - Contenido del mensaje.
   * @returns {boolean}
   */
  hasContextualClues(content) {
    if (typeof content !== 'string') return false;
    const contextualPatterns = /(?:me siento|estoy|siento que|creo que)/i;
    return contextualPatterns.test(content);
  }

  /**
   * Determina si la emoción requiere atención especial.
   * @param {Object} emotion - Emoción detectada.
   * @param {number} intensity - Intensidad emocional.
   * @returns {boolean}
   */
  checkIfRequiresAttention(emotion, intensity) {
    if (!emotion) return false;
    return emotion.category === 'negative' && intensity >= 7;
  }

  /**
   * Ajusta el análisis emocional basado en el historial previo.
   * @param {Object} currentEmotion - Emoción actual.
   * @param {number} currentIntensity - Intensidad actual.
   * @param {Array} previousPatterns - Historial previo.
   * @returns {Object} Análisis ajustado.
   */
  adjustBasedOnHistory(currentEmotion, currentIntensity, previousPatterns) {
    if (!Array.isArray(previousPatterns) || !previousPatterns.length) {
      return { emotion: currentEmotion, intensity: currentIntensity };
    }
    const recentPatterns = previousPatterns.slice(-3);
    const emotionalTrend = this.analyzeEmotionalTrend(recentPatterns);
    return {
      emotion: currentEmotion,
      intensity: this.adjustIntensityBasedOnTrend(currentIntensity, emotionalTrend)
    };
  }

  /**
   * Analiza la tendencia emocional en el historial.
   * @param {Array} patterns - Historial de análisis.
   * @returns {string} Tendencia ('increasing', 'decreasing', 'stable').
   */
  analyzeEmotionalTrend(patterns) {
    if (!Array.isArray(patterns) || !patterns.length) return 'stable';
    const intensities = patterns.map(p => p.intensity);
    const average = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const lastIntensity = intensities[intensities.length - 1];
    if (lastIntensity > average + 2) return 'increasing';
    if (lastIntensity < average - 2) return 'decreasing';
    return 'stable';
  }

  /**
   * Ajusta la intensidad emocional según la tendencia.
   * @param {number} intensity - Intensidad actual.
   * @param {string} trend - Tendencia emocional.
   * @returns {number} Intensidad ajustada.
   */
  adjustIntensityBasedOnTrend(intensity, trend) {
    switch (trend) {
      case 'increasing':
        return Math.min(intensity + 1, 10);
      case 'decreasing':
        return Math.max(intensity - 1, 1);
      default:
        return intensity;
    }
  }

  /**
   * Devuelve un análisis emocional por defecto.
   * @returns {Object} Análisis por defecto.
   */
  getDefaultAnalysis() {
    return {
      mainEmotion: 'neutral',
      intensity: 5,
      category: 'neutral',
      secondary: [],
      confidence: 0.4,
      requiresAttention: false
    };
  }
}

export default new EmotionalAnalyzer(); 