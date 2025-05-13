import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';
import CreateHabitModal from '../components/habits/CreateHabitModal';

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

const HabitsScreen = ({ route }) => {
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('active'); // 'active', 'archived'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    icon: 'exercise',
    frequency: 'daily',
    reminder: new Date(),
  });

  const navigation = useNavigation();

  // Cargar hábitos desde la API con filtros
  const loadHabits = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const status = filterType; // 'active' o 'archived'
      const response = await fetch(`${API_URL}/api/habits?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los hábitos');
      }

      const data = await response.json();
      setHabits(data.data || []);
      console.log(data.data.map(h => h._id));
    } catch (error) {
      console.error('Error al cargar hábitos:', error);
      Alert.alert('Error', 'No se pudieron cargar los hábitos');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Recargar cuando cambia el filtro
  useEffect(() => {
    loadHabits();
  }, [filterType]);

  const handleHabitPress = useCallback((habit) => {
    navigation.navigate('Habits', { 
      screen: 'HabitDetails',
      params: {
        habitId: habit._id,
        habit: habit
      }
    });
  }, [navigation]);

  // Manejar apertura automática del modal
  useEffect(() => {
    if (route.params?.openModal) {
      setModalVisible(true);
      navigation.setParams({ openModal: undefined });
    }
  }, [route.params?.openModal]);

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

  // Header fijo con transparencia
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

  // Renderizar item de hábito actualizado
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

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={habits}
        renderItem={renderHabitItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={loadHabits}
        refreshing={loading}
      />

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
    paddingBottom: 100, // Espacio para FloatingNavBar
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
    bottom: 100, // Ajustado para FloatingNavBar
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#1D2B5F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  iconSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  frequencySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  frequencyButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  frequencyButtonTextSelected: {
    color: '#1ADDDB',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    marginBottom: 16,
  },
  reminderButtonText: {
    color: '#1ADDDB',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#1ADDDB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HabitsScreen; 