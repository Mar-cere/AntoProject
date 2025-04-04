import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions,} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const HabitCard = memo(() => {
    const navigation = useNavigation();
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
  
    const loadHabits = useCallback(async () => {
      try {
        const storedHabits = await AsyncStorage.getItem('habits');
        if (storedHabits) {
          const parsedHabits = JSON.parse(storedHabits);
          // Mostrar solo hábitos activos y ordenados por racha
          const activeHabits = parsedHabits
            .filter(habit => !habit.archived)
            .sort((a, b) => b.streak - a.streak)
            .slice(0, 3); // Mostrar solo los 3 mejores
          setHabits(activeHabits);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar hábitos:', error);
        setLoading(false);
      }
    }, []);
  
    useEffect(() => {
      loadHabits();
    }, []);
  
    const getStreakColor = (streak) => {
      if (streak >= 30) return '#FFD700';
      if (streak >= 15) return '#C0C0C0';
      if (streak >= 7) return '#CD7F32';
      return '#1ADDDB';
    };
  
    return (
      <View style={styles.habitCardContainer}>
        <View style={styles.habitCardHeader}>
          <View style={styles.habitTitleContainer}>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color="#1ADDDB" />
            <Text style={styles.habitCardTitle}>Mis Hábitos</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Habits')}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#1ADDDB" />
          </TouchableOpacity>
        </View>
  
        {loading ? (
          <ActivityIndicator color="#1ADDDB" style={styles.loader} />
        ) : habits.length > 0 ? (
          <View style={styles.habitsContainer}>
            {habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={styles.habitItem}
                onPress={() => navigation.navigate('Habits', { habitId: habit.id })}
                activeOpacity={0.7}
              >
                <View style={styles.habitItemContent}>
                  <View style={[
                    styles.habitIcon,
                    { backgroundColor: getStreakColor(habit.streak) }
                  ]}>
                    <MaterialCommunityIcons 
                      name={habit.icon} 
                      size={20} 
                      color="#FFFFFF" 
                    />
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={styles.habitItemTitle} numberOfLines={1}>
                      {habit.title}
                    </Text>
                    <View style={styles.streakContainer}>
                      <MaterialCommunityIcons 
                        name="fire" 
                        size={14} 
                        color={getStreakColor(habit.streak)} 
                      />
                      <Text style={[
                        styles.streakText,
                        { color: getStreakColor(habit.streak) }
                      ]}>
                        {habit.streak} días
                      </Text>
                    </View>
                  </View>
                  <View style={styles.habitProgress}>
                    <Text style={styles.progressText}>
                      {habit.completedToday ? '¡Completado!' : 'Pendiente'}
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill,
                          { 
                            width: `${(habit.completedDays / (habit.totalDays || 1)) * 100}%`,
                            backgroundColor: getStreakColor(habit.streak)
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="lightning-bolt" size={40} color="#A3B8E8" />
            <Text style={styles.emptyText}>No hay hábitos activos</Text>
            <TouchableOpacity 
              style={styles.addHabitButton}
              onPress={() => navigation.navigate('Habits', { openModal: true })}
            >
              <Text style={styles.addHabitText}>Crear hábito</Text>
            </TouchableOpacity>
          </View>
        )}
  
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('Habits', { openModal: true })}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={16} color="#1ADDDB" />
          <Text style={styles.addButtonText}>Nuevo hábito</Text>
        </TouchableOpacity>
      </View>
    );
  });

  const styles = StyleSheet.create({
    habitCardContainer: {
        backgroundColor: 'rgba(29, 43, 95, 0.8)',
        borderRadius: 15,
        padding: 4,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.1)',
      },
      habitCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      },
      habitTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      habitCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
      },
      habitsContainer: {
        gap: 12,
      },
      habitItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
      },
      habitItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      },
      habitIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
      },
      habitInfo: {
        flex: 1,
        gap: 4,
      },
      habitItemTitle: {
        fontSize: 16,
        fontWeight: '500',
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
      habitProgress: {
        alignItems: 'flex-end',
        gap: 4,
      },
      viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(26, 221, 219, 0.1)',
      },
      viewAllText: {
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
      loader: {
        padding: 24,
      },
      progressText: {
        fontSize: 12,
        color: '#A3B8E8',
      },
      progressBar: {
        width: 60,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        overflow: 'hidden',
      },
      progressFill: {
        height: '100%',
        borderRadius: 2,
      },
      emptyContainer: {
        alignItems: 'center',
        padding: 24,
        gap: 12,
      },
      emptyText: {
        color: '#A3B8E8',
        fontSize: 16,
        textAlign: 'center',
      },
      addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginTop: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(26, 221, 219, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.2)',
        borderStyle: 'dashed',
      },
      addButtonText: {
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
      addHabitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        marginTop: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(26, 221, 219, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.2)',
        borderStyle: 'dashed',
      },
      addHabitText: {
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
  });

  export default HabitCard;