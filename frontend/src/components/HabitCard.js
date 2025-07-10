import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, Animated, 
  Easing, Alert, RefreshControl, ScrollView
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadHabits = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No se encontró token de autenticación');
      }

      const response = await fetch(`${API_URL}/api/habits/active`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const habitsArray = data.data || [];
      
      // Ordenar por streak y tomar los top 3
      const topHabits = habitsArray
        .sort((a, b) => (b.progress?.streak || 0) - (a.progress?.streak || 0))
        .slice(0, 3);
      
      setHabits(topHabits);
    } catch (error) {
      console.error('Error cargando hábitos:', error);
      setError(error.message);
      
      if (error.message.includes('401') || error.message.includes('403')) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
        await AsyncStorage.removeItem('userToken');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    loadHabits(true);
  }, [loadHabits]);

  useEffect(() => {
    loadHabits();
  }, [loadHabits]);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={cardColors.primary} style={commonStyles.loader} />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={24} 
            color={cardColors.error} 
          />
          <Text style={styles.errorText}>Error al cargar hábitos</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadHabits()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (habits.length === 0) {
      return (
        <EmptyState 
          icon="lightning-bolt"
          message="No hay hábitos activos"
          onAdd={() => navigation.navigate('Habits', { openModal: true })}
          addButtonText="Crear hábito"
        />
      );
    }

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[cardColors.primary]}
            tintColor={cardColors.primary}
          />
        }
      >
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
      </ScrollView>
    );
  };

  return (
    <View style={commonStyles.cardContainer}>
      <CardHeader 
        icon="lightning-bolt"
        title="Mis Hábitos"
        onViewAll={() => navigation.navigate('Habits')}
      />

      {renderContent()}
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
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  errorText: {
    color: cardColors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: cardColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  }
};

export default HabitCard;