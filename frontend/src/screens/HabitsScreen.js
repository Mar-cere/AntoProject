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
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('exercise');
  const [frequency, setFrequency] = useState('daily');
  const [reminder, setReminder] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const navigation = useNavigation();

  // Cargar hábitos desde la API
  const loadHabits = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/habits`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener los hábitos');
      }

      const data = await response.json();
      setHabits(data);
    } catch (error) {
      console.error('Error al cargar hábitos:', error);
      Alert.alert('Error', 'No se pudieron cargar los hábitos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHabits();
  }, []);

  // Manejar apertura automática del modal
  useEffect(() => {
    if (route.params?.openModal) {
      setModalVisible(true);
      navigation.setParams({ openModal: undefined });
    }
  }, [route.params?.openModal]);

  // Agregar nuevo hábito
  const handleAddHabit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const newHabit = {
        title: title.trim(),
        description: description.trim(),
        icon: selectedIcon,
        frequency,
        reminder,
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
        throw new Error('Error al crear el hábito');
      }

      const createdHabit = await response.json();
      setHabits(prevHabits => [...prevHabits, createdHabit]);
      setModalVisible(false);
      resetForm();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo crear el hábito');
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

      if (!response.ok) {
        throw new Error('Error al actualizar el hábito');
      }

      const updatedHabit = await response.json();
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
    setTitle('');
    setDescription('');
    setSelectedIcon('exercise');
    setFrequency('daily');
    setReminder(new Date());
  };

  // Renderizar item de hábito
  const renderHabitItem = ({ item }) => (
    <View style={styles.habitCard}>
      <View style={styles.habitHeader}>
        <View style={styles.habitTitleContainer}>
          <MaterialCommunityIcons 
            name={HABIT_ICONS[item.icon]} 
            size={24} 
            color="#1ADDDB" 
          />
          <Text style={styles.habitTitle}>{item.title}</Text>
        </View>
        <View style={styles.habitActions}>
          <TouchableOpacity
            onPress={() => toggleHabitComplete(item._id)}
            style={styles.completeButton}
          >
            <MaterialCommunityIcons
              name={item.completedToday ? "check-circle" : "circle-outline"}
              size={28}
              color={item.completedToday ? "#4CAF50" : "#A3B8E8"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteHabit(item._id)}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {item.description ? (
        <Text style={styles.habitDescription}>{item.description}</Text>
      ) : null}

      <View style={styles.habitFooter}>
        <View style={styles.habitStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="fire" size={16} color="#FFD93D" />
            <Text style={styles.statText}>Racha: {item.streak}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="calendar-check" size={16} color="#6BCB77" />
            <Text style={styles.statText}>
              {item.completedDays}/{item.totalDays} días
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.archiveButton}
          onPress={() => toggleArchiveHabit(item._id)}
        >
          <MaterialCommunityIcons
            name={item.archived ? "archive-arrow-up" : "archive"}
            size={20}
            color="#A3B8E8"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Renderizar modal de nuevo hábito
  const renderModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalVisible(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Hábito</Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <TextInput
              style={styles.input}
              placeholder="Título"
              placeholderTextColor="#A3B8E8"
              value={title}
              onChangeText={setTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción (opcional)"
              placeholderTextColor="#A3B8E8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.sectionTitle}>Icono</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.iconSelector}
            >
              {Object.entries(HABIT_ICONS).map(([key, icon]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.iconButton,
                    selectedIcon === key && styles.iconButtonSelected
                  ]}
                  onPress={() => setSelectedIcon(key)}
                >
                  <MaterialCommunityIcons
                    name={icon}
                    size={24}
                    color={selectedIcon === key ? "#1ADDDB" : "#A3B8E8"}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Frecuencia</Text>
            <View style={styles.frequencySelector}>
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'daily' && styles.frequencyButtonSelected
                ]}
                onPress={() => setFrequency('daily')}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  frequency === 'daily' && styles.frequencyButtonTextSelected
                ]}>Diario</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.frequencyButton,
                  frequency === 'weekly' && styles.frequencyButtonSelected
                ]}
                onPress={() => setFrequency('weekly')}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  frequency === 'weekly' && styles.frequencyButtonTextSelected
                ]}>Semanal</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recordatorio</Text>
            <TouchableOpacity
              style={styles.reminderButton}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="clock-outline" size={20} color="#1ADDDB" />
              <Text style={styles.reminderButtonText}>
                {reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={reminder}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setReminder(selectedDate);
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddHabit}
            >
              <Text style={styles.addButtonText}>Crear Hábito</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  return (
    <View style={styles.container}>
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
            <Text style={[
              styles.filterButtonText,
              filterType === 'archived' && styles.filterButtonTextActive
            ]}>Archivados</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={habits.filter(habit => 
          filterType === 'active' ? !habit.archived : habit.archived
        )}
        renderItem={renderHabitItem}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
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

      <FloatingNavBar />
      {renderModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  header: {
    padding: 16,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
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
  },
  habitCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  habitDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    marginTop: 4,
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  habitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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