const contextAnalyzer = {
  async analyzeMessageIntent(message, history) {
    const intents = {
      SEEKING_HELP: {
        patterns: /ayuda|necesito|no sé|confused|perdido/i,
        priority: 5
      },
      EMOTIONAL_SUPPORT: {
        patterns: /triste|ansioso|preocupado|mal|angustia/i,
        priority: 4
      },
      SHARING_PROGRESS: {
        patterns: /logré|conseguí|pude|mejor|avance/i,
        priority: 3
      },
      ASKING_QUESTION: {
        patterns: /\?|cómo|qué|cuándo|dónde|por qué/i,
        priority: 2
      },
      GENERAL_CHAT: {
        patterns: /.*/,
        priority: 1
      }
    };

    let highestPriority = 0;
    let detectedIntent = 'GENERAL_CHAT';

    Object.entries(intents).forEach(([intent, data]) => {
      if (data.patterns.test(message.content) && data.priority > highestPriority) {
        highestPriority = data.priority;
        detectedIntent = intent;
      }
    });

    return {
      intent: detectedIntent,
      priority: highestPriority,
      requiresFollowUp: highestPriority > 3
    };
  },

  generateResponseStrategy(intent, context) {
    const strategies = {
      SEEKING_HELP: {
        approach: 'supportive',
        responseLength: 'MEDIUM',
        includeResources: true,
        followUpPriority: 'HIGH'
      },
      EMOTIONAL_SUPPORT: {
        approach: 'empathetic',
        responseLength: 'MEDIUM',
        includeTechniques: true,
        followUpPriority: 'HIGH'
      },
      SHARING_PROGRESS: {
        approach: 'encouraging',
        responseLength: 'SHORT',
        includeReinforcement: true,
        followUpPriority: 'MEDIUM'
      },
      ASKING_QUESTION: {
        approach: 'informative',
        responseLength: 'MEDIUM',
        includeExamples: true,
        followUpPriority: 'MEDIUM'
      },
      GENERAL_CHAT: {
        approach: 'casual',
        responseLength: 'SHORT',
        includeEngagement: true,
        followUpPriority: 'LOW'
      }
    };

    return strategies[intent] || strategies.GENERAL_CHAT;
  }
};

export default contextAnalyzer; 