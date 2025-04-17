const goalTracker = {
  async updateGoalProgress(userId, message, analysis) {
    const goals = {
      EMOTIONAL_WELLBEING: {
        keywords: /mejor|tranquilo|calma|paz|bienestar/i,
        progress: 0.2
      },
      ACADEMIC_PROGRESS: {
        keywords: /estudiar|aprobar|entender|aprender/i,
        progress: 0.15
      },
      SELF_IMPROVEMENT: {
        keywords: /mejorar|cambiar|crecer|desarrollar/i,
        progress: 0.1
      }
    };

    try {
      const userGoals = await UserGoals.findOne({ userId });
      if (!userGoals) return;

      Object.entries(goals).forEach(async ([goalType, data]) => {
        if (data.keywords.test(message.content)) {
          await UserGoals.updateOne(
            { 
              userId, 
              'goals.type': goalType 
            },
            {
              $inc: { 'goals.$.progress': data.progress },
              $push: {
                'goals.$.milestones': {
                  date: new Date(),
                  description: message.content,
                  emotionalState: analysis.emotionalContext.mainEmotion
                }
              }
            }
          );
        }
      });
    } catch (error) {
      console.error('Error actualizando progreso de objetivos:', error);
    }
  }
};

export default goalTracker; 