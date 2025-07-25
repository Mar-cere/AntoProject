import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  StatusBar,
  RefreshControl
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';
import CreateHabitModal from '../components/habits/CreateHabitModal';
import { scheduleHabitNotification, cancelHabitNotifications } from '../utils/notifications';

const API_URL = 'https://antobackend.onrender.com';

const HABIT_ICONS = {
  exercise: 'run',
  meditation: 'meditation',
  reading: 'book-open-variant',
  water: 'water',
  sleep: 'sleep',
  study: 'book-education',
  diet: 'food-apple',
  coding: 'code-tags',
};

const HabitsScreen = ({ route, navigation }) => {
  // Estados
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'exercise',
    frequency: 'daily',
    reminder: new Date(),
  });

  // Cargar hábitos
  const loadHabits = async (isRefresh = false) => {
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
      
      const response = await fetch(`${API_URL}/api/habits?status=${filterType}`, {
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
      setHabits(data.data?.habits || []);
    } catch (error) {
      console.error('Error al cargar hábitos:', error);
      setError(error.message);
      
      if (error.message.includes('401') || error.message.includes('403')) {
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
        await AsyncStorage.removeItem('userToken');
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'SignIn' }],
          });
        }, 100);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Pull to refresh
  const onRefresh = () => {
    loadHabits(true);
  };

  // Cargar hábitos al montar y cuando cambia el filtro
  useEffect(() => {
    loadHabits();
  }, [filterType]);

  // Manejar apertura automática del modal
  useEffect(() => {
    if (route.params?.openModal) {
      setModalVisible(true);
      navigation.setParams({ openModal: undefined });
    }
  }, [route.params?.openModal]);

  // Navegar a detalles del hábito
  const handleHabitPress = (habit) => {
    navigation.navigate('Habits', { 
      screen: 'HabitDetails',
      params: {
        habitId: habit._id,
        habit: habit
      }
    });
  };

  // Agregar nuevo hábito
  const handleAddHabit = async (data) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const newHabit = {
        title: data.title.trim(),
        description: data.description?.trim() || '',
        icon: data.icon,
        frequency: data.frequency,
        reminder: data.reminder,
      };

      const response = await fetch(`${API_URL}/api/habits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newHabit)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el hábito');
      }

      const result = await response.json();
      const createdHabit = result.data;
      setHabits(prevHabits => [createdHabit, ...prevHabits]);
      setModalVisible(false);
      resetForm();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // await scheduleHabitNotification(createdHabit);

    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', error.message || 'No se pudo crear el hábito');
    }
  };

  // Marcar hábito como completado
  const toggleHabitComplete = async (habitId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/habits/${habitId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Error al actualizar el hábito');
      }

      const updatedHabit = result.data;
      setHabits(prevHabits =>
        prevHabits.map(habit =>
          habit._id === habitId ? updatedHabit : habit
        )
      );
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar el hábito');
    }
  };

  // Archivar hábito
  const toggleArchiveHabit = async (habitId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/habits/${habitId}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al archivar el hábito');
      }

      const updatedHabit = await response.json();
      setHabits(prevHabits =>
        prevHabits.map(habit =>
          habit._id === habitId ? updatedHabit : habit
        )
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo archivar el hábito');
    }
  };

  // Eliminar hábito
  const handleDeleteHabit = (habitId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este hábito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/habits/${habitId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                throw new Error('Error al eliminar el hábito');
              }

              setHabits(prevHabits => prevHabits.filter(habit => habit._id !== habitId));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await cancelHabitNotifications(habitId);
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo eliminar el hábito');
            }
          }
        }
      ]
    );
  };

  // Resetear formulario
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      icon: 'exercise',
      frequency: 'daily',
      reminder: new Date(),
    });
  };

  // Header
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Hábitos</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'active' && styles.filterButtonActive
            ]}
            onPress={() => setFilterType('active')}
          >
            <MaterialCommunityIcons 
              name="checkbox-marked-circle-outline" 
              size={20} 
              color={filterType === 'active' ? '#FFFFFF' : '#A3B8E8'} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'active' && styles.filterButtonTextActive
            ]}>Activos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'archived' && styles.filterButtonActive
            ]}
            onPress={() => setFilterType('archived')}
          >
            <MaterialCommunityIcons 
              name="archive-outline" 
              size={20} 
              color={filterType === 'archived' ? '#FFFFFF' : '#A3B8E8'} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'archived' && styles.filterButtonTextActive
            ]}>Archivados</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Renderizar item de hábito
  const renderHabitItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.habitCard,
        item.status?.archived && styles.archivedHabitCard
      ]}
      onPress={() => handleHabitPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.habitHeader}>
        <View style={styles.habitTitleContainer}>
          <View style={[
            styles.iconContainer,
            item.status?.archived && styles.archivedIconContainer
          ]}>
            <MaterialCommunityIcons 
              name={HABIT_ICONS[item.icon]} 
              size={24} 
              color={item.status?.archived ? '#A3B8E8' : '#1ADDDB'} 
            />
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.habitDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          onPress={() => toggleHabitComplete(item._id)}
          style={[
            styles.completeButton,
            item.status?.completedToday && styles.completedButton
          ]}
          disabled={item.status?.archived}
        >
          <MaterialCommunityIcons
            name={item.status?.completedToday ? "check-circle" : "circle-outline"}
            size={28}
            color={item.status?.completedToday ? "#4CAF50" : "#A3B8E8"}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.habitFooter}>
        <View style={styles.habitStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={16} color="#FFD93D" />
            <Text style={styles.statText}>
              Racha: {item.progress?.streak || 0}
              {item.progress?.bestStreak > 0 && ` (Mejor: ${item.progress.bestStreak})`}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar-check" size={16} color="#6BCB77" />
            <Text style={styles.statText}>
              {item.progress?.completedDays || 0}/{item.progress?.totalDays || 0} días
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons 
              name={item.frequency === 'daily' ? "repeat" : "calendar-week"} 
              size={16} 
              color="#1ADDDB" 
            />
            <Text style={styles.statText}>
              {item.frequency === 'daily' ? 'Diario' : 'Semanal'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Renderizar contenido
  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons 
            name="alert-circle" 
            size={48} 
            color="#FF6B6B" 
          />
          <Text style={styles.errorText}>Error al cargar hábitos</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => loadHabits()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={habits}
        renderItem={renderHabitItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1ADDDB']}
            tintColor="#1ADDDB"
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name="lightning-bolt" 
                size={64} 
                color="#A3B8E8" 
              />
              <Text style={styles.emptyText}>
                {filterType === 'active' 
                  ? 'No hay hábitos activos' 
                  : 'No hay hábitos archivados'
                }
              </Text>
              {filterType === 'active' && (
                <TouchableOpacity 
                  style={styles.addFirstButton}
                  onPress={() => {
                    resetForm();
                    setModalVisible(true);
                  }}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#1ADDDB" />
                  <Text style={styles.addFirstText}>Crear primer hábito</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
      />
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <CreateHabitModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          resetForm();
        }}
        onSubmit={handleAddHabit}
        formData={formData}
        setFormData={setFormData}
      />
      
      <FloatingNavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  headerContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight,
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: '#1ADDDB',
  },
  filterButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  habitCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  archivedHabitCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.4)',
    borderColor: 'rgba(163, 184, 232, 0.1)',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  archivedIconContainer: {
    backgroundColor: 'rgba(163, 184, 232, 0.1)',
  },
  habitInfo: {
    flex: 1,
    gap: 4,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  habitDescription: {
    fontSize: 14,
    color: '#A3B8E8',
  },
  habitFooter: {
    marginTop: 8,
  },
  habitStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  completeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1ADDDB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#A3B8E8',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1ADDDB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyText: {
    color: '#A3B8E8',
    fontSize: 16,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.2)',
  },
  addFirstText: {
    color: '#1ADDDB',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default HabitsScreen; 