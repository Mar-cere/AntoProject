class EmotionalAnalyzer {
  constructor() {
    this.emotionPatterns = {
      tristeza: {
        patterns: /(?:triste(?:za)?|deprimi(?:do|da)|sin energía|desánimo|desmotiva(?:do|da)|solo|soledad)/i,
        intensity: 7,
        category: 'negative'
      },
      ansiedad: {
        patterns: /(?:ansie(?:dad|oso)|nervios|inquiet(?:o|ud)|preocupa(?:do|ción)|angustia)/i,
        intensity: 6,
        category: 'negative'
      },
      enojo: {
        patterns: /(?:enoja(?:do|da)|ira|rabia|molest(?:o|a)|frustrad(?:o|a)|impotencia)/i,
        intensity: 8,
        category: 'negative'
      },
      alegria: {
        patterns: /(?:feliz|contento|alegr(?:e|ía)|satisfech(?:o|a)|motivad(?:o|a)|entusiasm(?:o|ado))/i,
        intensity: 7,
        category: 'positive'
      },
      neutral: {
        patterns: /(?:normal|tranquil(?:o|a)|bien|regular|más o menos|asi asi)/i,
        intensity: 4,
        category: 'neutral'
      }
    };
  }

  async analyzeEmotion(content, previousPatterns = []) {
    try {
      if (!content || typeof content !== 'string') {
        return this.getDefaultAnalysis();
      }

      const contentLower = content.toLowerCase();
      let detectedEmotion = this.detectPrimaryEmotion(contentLower);
      let intensity = this.calculateIntensity(contentLower, detectedEmotion);
      let secondaryEmotions = this.detectSecondaryEmotions(contentLower, detectedEmotion.name);

      // Ajustar basado en patrones previos si existen
      if (previousPatterns && previousPatterns.length > 0) {
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
      console.error('Error en análisis emocional:', error);
      return this.getDefaultAnalysis();
    }
  }

  detectPrimaryEmotion(content) {
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

  calculateIntensity(content, emotion) {
    const intensifiers = /(?:muy|mucho|demasiado|extremadamente|totalmente)/i;
    const diminishers = /(?:poco|algo|ligeramente|un poco)/i;
    
    let intensity = emotion.baseIntensity;
    
    if (intensifiers.test(content)) {
      intensity = Math.min(intensity + 2, 10);
    } else if (diminishers.test(content)) {
      intensity = Math.max(intensity - 2, 1);
    }
    
    return intensity;
  }

  detectSecondaryEmotions(content, primaryEmotion) {
    const secondaryEmotions = [];
    
    for (const [emotion, data] of Object.entries(this.emotionPatterns)) {
      if (emotion !== primaryEmotion && data.patterns.test(content)) {
        secondaryEmotions.push(emotion);
      }
    }
    
    return secondaryEmotions;
  }

  calculateConfidence(content, emotion) {
    const matchStrength = emotion.patterns?.test(content) ? 0.8 : 0.4;
    const contextualClues = this.hasContextualClues(content) ? 0.1 : 0;
    return Math.min(matchStrength + contextualClues, 1);
  }

  hasContextualClues(content) {
    const contextualPatterns = /(?:me siento|estoy|siento que|creo que)/i;
    return contextualPatterns.test(content);
  }

  checkIfRequiresAttention(emotion, intensity) {
    return emotion.category === 'negative' && intensity >= 7;
  }

  adjustBasedOnHistory(currentEmotion, currentIntensity, previousPatterns) {
    if (!previousPatterns.length) {
      return { emotion: currentEmotion, intensity: currentIntensity };
    }

    const recentPatterns = previousPatterns.slice(-3);
    const emotionalTrend = this.analyzeEmotionalTrend(recentPatterns);

    return {
      emotion: currentEmotion,
      intensity: this.adjustIntensityBasedOnTrend(currentIntensity, emotionalTrend)
    };
  }

  analyzeEmotionalTrend(patterns) {
    if (!patterns.length) return 'stable';
    
    const intensities = patterns.map(p => p.intensity);
    const average = intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const lastIntensity = intensities[intensities.length - 1];

    if (lastIntensity > average + 2) return 'increasing';
    if (lastIntensity < average - 2) return 'decreasing';
    return 'stable';
  }

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