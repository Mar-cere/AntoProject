import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, Animated, 
  Easing 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commonStyles, cardColors, CardHeader, EmptyState } from './common/CardStyles';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://antobackend.onrender.com';

const HabitItem = memo(({ habit, onPress }) => {
  const scaleAnim = new Animated.Value(1);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (habit.progress?.completedDays || 0) / (habit.progress?.totalDays || 1),
      duration: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: false
    }).start();
  }, [habit.progress]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const getStreakColor = (streak = 0) => {
    if (streak >= 30) return '#FFD700'; // Oro
    if (streak >= 15) return '#C0C0C0'; // Plata
    if (streak >= 7) return '#CD7F32'; // Bronce
    return cardColors.primary;
  };

  const streakColor = getStreakColor(habit.progress?.streak);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[commonStyles.itemContainer, styles.habitItem]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.habitContent}>
          {/* Icono y título */}
          <View style={styles.habitHeader}>
            <View style={[styles.habitIcon, { backgroundColor: streakColor }]}>
              <MaterialCommunityIcons 
                name={habit.icon || 'lightning-bolt'} 
                size={20} 
                color="#FFFFFF" 
              />
            </View>
            <View style={styles.habitInfo}>
              <Text style={styles.habitTitle} numberOfLines={1}>
                {habit.title}
              </Text>
              <View style={styles.streakContainer}>
                <MaterialCommunityIcons 
                  name="fire" 
                  size={14} 
                  color={streakColor} 
                />
                <Text style={[styles.streakText, { color: streakColor }]}>
                  {habit.progress?.streak || 0} días
                </Text>
                {habit.progress?.bestStreak > (habit.progress?.streak || 0) && (
                  <Text style={styles.bestStreakText}>
                    (Mejor: {habit.progress.bestStreak})
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Barra de progreso y estado */}
          <View style={styles.progressSection}>
            <View style={styles.statusContainer}>
              <Text style={[
                styles.statusText,
                habit.status?.completedToday && styles.completedText
              ]}>
                {habit.status?.completedToday ? '¡Completado hoy!' : 'Pendiente'}
              </Text>
              <Text style={styles.progressText}>
                {`${habit.progress?.completedDays || 0}/${habit.progress?.totalDays || 0}`}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: streakColor
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const HabitCard = memo(() => {
  const navigation = useNavigation();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadHabits = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/habits?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los hábitos');
      }

      const data = await response.json();
      // data ahora es { success: true, data: [...] }
      const habitsArray = data.data || [];
      const topHabits = habitsArray
        .sort((a, b) => (b.progress?.streak || 0) - (a.progress?.streak || 0))
        .slice(0, 3);
      
      setHabits(topHabits);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar hábitos:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, []);

  return (
    <View style={commonStyles.cardContainer}>
      <CardHeader 
        icon="lightning-bolt"
        title="Mis Hábitos"
        onViewAll={() => navigation.navigate('Habits')}
      />

      {loading ? (
        <ActivityIndicator color={cardColors.primary} style={commonStyles.loader} />
      ) : habits.length > 0 ? (
        <View style={styles.habitsContainer}>
          {habits.map((habit) => (
            <HabitItem
              key={habit._id}
              habit={habit}
              onPress={() => navigation.navigate('Habits', { habitId: habit._id })}
            />
          ))}
          <TouchableOpacity 
            style={styles.addHabitButton}
            onPress={() => navigation.navigate('Habits', { openModal: true })}
          >
            <MaterialCommunityIcons 
              name="plus" 
              size={20} 
              color={cardColors.primary} 
            />
            <Text style={styles.addHabitText}>Nuevo hábito</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <EmptyState 
          icon="lightning-bolt"
          message="No hay hábitos activos"
          onAdd={() => navigation.navigate('Habits', { openModal: true })}
          addButtonText="Crear hábito"
        />
      )}
    </View>
  );
});

const styles = {
  habitsContainer: {
    gap: 12,
  },
  habitItem: {
    padding: 16,
  },
  habitContent: {
    gap: 12,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
    gap: 4,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bestStreakText: {
    fontSize: 12,
    color: cardColors.secondary,
    marginLeft: 4,
  },
  progressSection: {
    gap: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: cardColors.secondary,
  },
  completedText: {
    color: cardColors.success,
    fontWeight: '500',
  },
  progressText: {
    fontSize: 12,
    color: cardColors.secondary,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  addHabitButton: {
    ...commonStyles.addButton,
    marginTop: 8,
  },
  addHabitText: {
    ...commonStyles.addButtonText,
  }
};

export default HabitCard;