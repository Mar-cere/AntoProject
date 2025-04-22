import UserGoals from '../models/UserGoals.js';
import UserProgress from '../models/UserProgress.js';

class GoalTracker {
  async trackProgress(userId, data) {
    try {
      const { message, analysis } = data;
      
      let userGoals = await UserGoals.findOne({ userId });
      
      if (!userGoals) {
        userGoals = await this.initializeUserGoals(userId);
      }

      await this.updateGoalProgress(userId, message, analysis);
      
      return userGoals;
    } catch (error) {
      console.error('Error tracking progress:', error);
      return null;
    }
  }

  async updateProgress(userId, data) {
    try {
      const { message, context } = data;
      
      let userGoals = await UserGoals.findOne({ userId });
      
      if (!userGoals) {
        userGoals = await this.initializeUserGoals(userId);
      }

      // Actualizar progreso basado en el contexto
      const updates = this.calculateProgressUpdates(message, context);
      
      return await UserGoals.findOneAndUpdate(
        { userId },
        {
          $set: {
            'lastUpdate': new Date(),
            ...updates
          }
        },
        { new: true }
      );
    } catch (error) {
      console.error('Error updating progress:', error);
      return null;
    }
  }

  async initializeUserGoals(userId) {
    try {
      return await UserGoals.create({
        userId,
        goals: [],
        progress: {
          overall: 0,
          byCategory: {}
        },
        lastUpdate: new Date()
      });
    } catch (error) {
      console.error('Error initializing user goals:', error);
      return null;
    }
  }

  calculateProgressUpdates(message, context) {
    const updates = {
      'progress.lastInteraction': new Date()
    };

    if (context?.emotional?.mainEmotion) {
      updates['progress.emotionalState'] = {
        emotion: context.emotional.mainEmotion,
        intensity: context.emotional.intensity || 5,
        timestamp: new Date()
      };
    }

    if (context?.contextual?.topics) {
      updates['progress.activeTopics'] = context.contextual.topics;
    }

    return updates;
  }

  async updateGoalProgress(userId, message, analysis) {
    try {
      const update = {
        $push: {
          'interactions': {
            timestamp: new Date(),
            content: message.content,
            analysis: analysis
          }
        },
        $set: {
          'lastUpdate': new Date()
        }
      };

      return await UserGoals.findOneAndUpdate(
        { userId },
        update,
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }
  }
}

export default new GoalTracker(); 