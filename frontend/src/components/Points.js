import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const POINTS = {
  COMPLETE_TASK: 10,
  MAINTAIN_HABIT: 20,
  UNLOCK_ACHIEVEMENT: 50
};

export const usePoints = (initialPoints = 0) => {
  const [points, setPoints] = useState(initialPoints);

  const addPoints = useCallback(async (amount, reason) => {
    const newPoints = points + amount;
    setPoints(newPoints);
    await AsyncStorage.setItem('userPoints', newPoints.toString());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    return newPoints;
  }, [points]);

  return { points, addPoints, POINTS };
};
