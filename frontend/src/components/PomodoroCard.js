import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Animated, 
  Easing, Vibration
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PomodoroCard = memo(() => {
  const navigation = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const progressAnimation = new Animated.Value(0);

  const modes = {
    work: { 
      time: 25 * 60, 
      color: '#FF6B6B',
      icon: 'brain',
      label: 'Tiempo de Trabajo'
    },
    break: { 
      time: 5 * 60, 
      color: '#4CAF50',
      icon: 'coffee',
      label: 'Tiempo de Descanso'
    }
  };

  // Cargar sesiones completadas al iniciar
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const saved = await AsyncStorage.getItem('pomodoroSessions');
        if (saved) {
          setSessionsCompleted(parseInt(saved));
        }
      } catch (error) {
        console.error('Error loading pomodoro sessions:', error);
      }
    };
    loadSessions();
  }, []);

  // Guardar sesiones completadas
  const saveSessions = async (count) => {
    try {
      await AsyncStorage.setItem('pomodoroSessions', count.toString());
    } catch (error) {
      console.error('Error saving pomodoro sessions:', error);
    }
  };

  const toggleTimer = useCallback(() => {
    setIsActive(prev => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(modes[mode].time);
    progressAnimation.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [mode]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(modes[newMode].time);
    setIsActive(false);
    progressAnimation.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [mode]);

  // Notificación cuando termina el tiempo
  const notifyTimeUp = useCallback(() => {
    Vibration.vibrate([0, 500, 200, 500]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          const newTime = time - 1;
          const progress = 1 - (newTime / modes[mode].time);
          
          // Animación más suave
          Animated.timing(progressAnimation, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
            easing: Easing.linear
          }).start();
          
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      notifyTimeUp();
      if (mode === 'work') {
        // Incrementar sesiones completadas solo cuando termina el trabajo
        const newCount = sessionsCompleted + 1;
        setSessionsCompleted(newCount);
        saveSessions(newCount);
      }
      toggleMode();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressWidth = progressAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons 
            name={modes[mode].icon}
            size={24} 
            color={modes[mode].color} 
          />
          <Text style={styles.title}>{modes[mode].label}</Text>
        </View>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => navigation.navigate('Pomodoro')}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetailsText}>Ver detalles</Text>
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={16} 
            color="#1ADDDB" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        <Text style={[styles.timerText, { color: modes[mode].color }]}>
          {formatTime(timeLeft)}
        </Text>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressWidth,
                backgroundColor: modes[mode].color
              }
            ]} 
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          Sesiones completadas hoy: {sessionsCompleted}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity 
          style={[styles.controlButton, { backgroundColor: isActive ? '#FF5252' : modes[mode].color }]}
          onPress={toggleTimer}
        >
          <MaterialCommunityIcons 
            name={isActive ? 'pause' : 'play'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.controlButton, styles.resetButton]}
          onPress={resetTimer}
        >
          <MaterialCommunityIcons 
            name="restart" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.controlButton, styles.modeButton]}
          onPress={toggleMode}
        >
          <MaterialCommunityIcons 
            name={mode === 'work' ? 'coffee' : 'brain'} 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  viewDetailsText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: '500',
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statsText: {
    color: '#A3B8E8',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
  }
});

export default PomodoroCard;
