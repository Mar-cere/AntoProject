export class User {
  constructor(data) {
    this.id = data.id || data.customId;
    this.username = data.username;
    this.email = data.email;
    this.name = data.name;
    this.avatar = data.avatar;
    this.points = data.points || 0;
    this.preferences = data.preferences || {};
    this.therapeuticProfile = data.therapeuticProfile || {
      goals: [],
      emotionalHistory: []
    };
    this.createdAt = data.createdAt;
  }

  static fromJSON(json) {
    return new User(typeof json === 'string' ? JSON.parse(json) : json);
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      name: this.name,
      avatar: this.avatar,
      points: this.points,
      preferences: this.preferences,
      therapeuticProfile: this.therapeuticProfile,
      createdAt: this.createdAt
    };
  }

  update(data) {
    return new User({ ...this.toJSON(), ...data });
  }

  updatePreferences(preferences) {
    return new User({
      ...this.toJSON(),
      preferences: { ...this.preferences, ...preferences }
    });
  }

  addTherapeuticGoal(goal) {
    return new User({
      ...this.toJSON(),
      therapeuticProfile: {
        ...this.therapeuticProfile,
        goals: [...this.therapeuticProfile.goals, goal]
      }
    });
  }

  updateGoalProgress(goalId, progress) {
    const updatedGoals = this.therapeuticProfile.goals.map(goal =>
      goal.id === goalId ? { ...goal, progress } : goal
    );

    return new User({
      ...this.toJSON(),
      therapeuticProfile: {
        ...this.therapeuticProfile,
        goals: updatedGoals
      }
    });
  }

  recordSession(duration, emotionalState) {
    return new User({
      ...this.toJSON(),
      therapeuticProfile: {
        ...this.therapeuticProfile,
        emotionalHistory: [
          ...this.therapeuticProfile.emotionalHistory,
          {
            timestamp: new Date(),
            duration,
            emotionalState
          }
        ]
      }
    });
  }
}
