import AsyncStorage from '@react-native-async-storage/async-storage';

// Gestionar objetivos terapéuticos
export const manageTherapeuticGoals = async (action, goalData = null) => {
  try {
    // Obtener objetivos existentes
    const goalsData = await AsyncStorage.getItem('therapeuticGoals');
    let goals = goalsData ? JSON.parse(goalsData) : [];
    
    switch (action) {
      case 'get':
        return goals;
        
      case 'add':
        if (goalData) {
          const newGoal = {
            id: Date.now().toString(),
            description: goalData.description,
            created: new Date().toISOString(),
            steps: goalData.steps || [],
            progress: 0,
            completed: false,
            category: goalData.category || 'general'
          };
          goals.push(newGoal);
          await AsyncStorage.setItem('therapeuticGoals', JSON.stringify(goals));
        }
        return goals;
        
      case 'update':
        if (goalData && goalData.id) {
          const index = goals.findIndex(g => g.id === goalData.id);
          if (index !== -1) {
            goals[index] = {...goals[index], ...goalData};
            await AsyncStorage.setItem('therapeuticGoals', JSON.stringify(goals));
          }
        }
        return goals;
        
      case 'delete':
        if (goalData && goalData.id) {
          goals = goals.filter(g => g.id !== goalData.id);
          await AsyncStorage.setItem('therapeuticGoals', JSON.stringify(goals));
        }
        return goals;
        
      default:
        return goals;
    }
  } catch (error) {
    console.error('Error al gestionar objetivos terapéuticos:', error);
    return [];
  }
}; 