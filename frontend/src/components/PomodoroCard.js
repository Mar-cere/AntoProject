import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, Animated, Easing, Vibration,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonStyles, cardColors, CardHeader } from './common/CardStyles';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TIMER_SIZE = width * 0.4;

const modes = {
  work: { 
    time: 25 * 60, 
    color: '#FF6B6B',
    icon: 'brain',
    label: 'Tiempo de Trabajo',
    description: 'Mantén el foco'
  },
  break: { 
    time: 5 * 60, 
    color: '#4CAF50',
    icon: 'coffee',
    label: 'Descanso',
    description: 'Toma un respiro'
  }
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const TimerDisplay = memo(({ timeLeft, totalTime, isActive, color }) => {
  const progressAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    const progress = 1 - (timeLeft / totalTime);
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false
    }).start();

    if (isActive) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 500,
          easing: Easing.out(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.in(Easing.sin),
          useNativeDriver: true
        })
      ]).start();
    }
  }, [timeLeft, isActive]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const circumference = 2 * Math.PI * (TIMER_SIZE / 2);
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <Animated.View style={[
      styles.timerContainer,
      { transform: [{ scale: scaleAnim }] }
    ]}>
      <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
        {/* Círculo de fondo */}
        <Circle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={(TIMER_SIZE / 2) - 10}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="10"
          fill="transparent"
        />
        {/* Círculo de progreso */}
        <AnimatedCircle
          cx={TIMER_SIZE / 2}
          cy={TIMER_SIZE / 2}
          r={(TIMER_SIZE / 2) - 10}
          stroke={color}
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.timerContent}>
        <Text style={[styles.timerText, { color }]}>
          {formatTime(timeLeft)}
        </Text>
        <Text style={styles.timerLabel}>
          {isActive ? 'En progreso' : 'Pausado'}
        </Text>
      </View>
    </Animated.View>
  );
});

const ControlButton = memo(({ icon, onPress, color, size = 50 }) => {
  const scaleAnim = new Animated.Value(1);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.controlButton, { backgroundColor: color, width: size, height: size }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <MaterialCommunityIcons name={icon} size={size * 0.5} color="#FFFFFF" />
      </TouchableOpacity>
    </Animated.View>
  );
});

const PomodoroCard = memo(() => {
  const navigation = useNavigation();
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(modes.work.time);
  const [mode, setMode] = useState('work');
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

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
      setMode(mode === 'work' ? 'break' : 'work');
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  return (
    <View style={commonStyles.cardContainer}>
      <CardHeader 
        icon={modes[mode].icon}
        title={modes[mode].label}
        onViewAll={() => navigation.navigate('Pomodoro')}
      />

      <View style={styles.contentContainer}>
        <TimerDisplay 
          timeLeft={timeLeft}
          totalTime={modes[mode].time}
          isActive={isActive}
          color={modes[mode].color}
        />

        <View style={styles.controlsContainer}>
          <ControlButton 
            icon={isActive ? 'pause' : 'play'}
            onPress={() => {
              setIsActive(!isActive);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            color={modes[mode].color}
            size={60}
          />
          <ControlButton 
            icon="restart"
            onPress={() => {
              setTimeLeft(modes[mode].time);
              setIsActive(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            color="rgba(255,255,255,0.2)"
            size={46}
          />
          <ControlButton 
            icon={mode === 'work' ? 'coffee' : 'brain'}
            onPress={() => {
              setMode(mode === 'work' ? 'break' : 'work');
              setTimeLeft(modes[mode === 'work' ? 'break' : 'work'].time);
              setIsActive(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            color="rgba(255,255,255,0.2)"
            size={46}
          />
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="check-circle" 
              size={20} 
              color={cardColors.success} 
            />
            <Text style={styles.statValue}>{sessionsCompleted}</Text>
            <Text style={styles.statLabel}>Sesiones</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name="timer-outline" 
              size={20} 
              color={modes[mode].color} 
            />
            <Text style={styles.statValue}>
              {Math.floor((modes[mode].time - timeLeft) / 60)}
            </Text>
            <Text style={styles.statLabel}>Minutos</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = {
  contentContainer: {
    alignItems: 'center',
    gap: 24,
    paddingVertical: 16,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 40,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: cardColors.secondary,
    marginTop: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: cardColors.secondary,
  }
};

export default PomodoroCard;
