import React, { useState, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import FloatingNavBar from '../components/FloatingNavBar';


const HABIT_ICONS = [
  { name: 'run', label: 'Ejercicio' },
  { name: 'food-apple', label: 'Alimentación' },
  { name: 'book', label: 'Lectura' },
  { name: 'meditation', label: 'Meditación' },
  { name: 'water', label: 'Agua' },
  { name: 'sleep', label: 'Dormir' },
  { name: 'pencil', label: 'Estudiar' },
  { name: 'pill', label: 'Medicación' },
  { name: 'smoking-off', label: 'No fumar' },
  { name: 'weight', label: 'Peso' },
];

const HabitsScreen = ({ route, navigation }) => {
  const [habits, setHabits] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('active'); // 'active', 'archived'
  
  // Estados para nuevo hábito
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(HABIT_ICONS[0].name);
  const [frequency, setFrequency] = useState('daily'); // 'daily', 'weekly'
  const [reminder, setReminder] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Cargar hábitos
  const loadHabits = useCallback(async () => {
    try {
      const storedHabits = await AsyncStorage.getItem('habits');
      if (storedHabits) {
        setHabits(JSON.parse(storedHabits));
      }
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar hábitos:', error);
      Alert.alert('Error', 'No se pudieron cargar los hábitos');
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

  // Guardar hábitos
  const saveHabits = async (newHabits) => {
    try {
      await AsyncStorage.setItem('habits', JSON.stringify(newHabits));
    } catch (error) {
      console.error('Error al guardar hábitos:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    }
  };

  // Agregar nuevo hábito
  const handleAddHabit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    const newHabit = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      icon: selectedIcon,
      frequency,
      reminder: reminder.toISOString(),
      streak: 0,
      completedDays: 0,
      totalDays: 0,
      completedToday: false,
      archived: false,
      createdAt: new Date().toISOString(),
      lastCompleted: null,
    };

    const newHabits = [...habits, newHabit];
    setHabits(newHabits);
    await saveHabits(newHabits);
    
    setModalVisible(false);
    resetForm();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Marcar hábito como completado
  const toggleHabitComplete = async (habitId) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    setHabits(prevHabits => {
      const newHabits = prevHabits.map(habit => {
        if (habit.id !== habitId) return habit;

        const lastCompleted = habit.lastCompleted ? new Date(habit.lastCompleted) : null;
        const wasCompletedToday = lastCompleted && 
          lastCompleted.getFullYear() === today.getFullYear() &&
          lastCompleted.getMonth() === today.getMonth() &&
          lastCompleted.getDate() === today.getDate();

        if (wasCompletedToday) {
          // Desmarcar el hábito
          return {
            ...habit,
            completedToday: false,
            lastCompleted: null,
            streak: Math.max(0, habit.streak - 1),
            completedDays: Math.max(0, habit.completedDays - 1)
          };
        } else {
          // Marcar el hábito como completado
          return {
            ...habit,
            completedToday: true,
            lastCompleted: now.toISOString(),
            streak: habit.streak + 1,
            completedDays: habit.completedDays + 1,
            totalDays: habit.totalDays + 1
          };
        }
      });

      saveHabits(newHabits);
      return newHabits;
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Archivar/Desarchivar hábito
  const toggleArchiveHabit = (habitId) => {
    Alert.alert(
      'Confirmar acción',
      '¿Estás seguro de que quieres archivar/desarchivar este hábito?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const newHabits = habits.map(habit =>
              habit.id === habitId ? { ...habit, archived: !habit.archived } : habit
            );
            setHabits(newHabits);
            await saveHabits(newHabits);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  // Eliminar hábito
  const handleDeleteHabit = (habitId) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que quieres eliminar este hábito? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const newHabits = habits.filter(habit => habit.id !== habitId);
            setHabits(newHabits);
            await saveHabits(newHabits);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        }
      ]
    );
  };

  // Resetear formulario
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedIcon(HABIT_ICONS[0].name);
    setFrequency('daily');
    setReminder(new Date());
  };

  // Renderizar item de hábito
  const renderHabitItem = ({ item }) => (
    <View style={styles.habitCard}>
      <View style={styles.habitHeader}>
        <View style={styles.habitTitleContainer}>
          <View style={[
            styles.habitIcon,
            { backgroundColor: getStreakColor(item.streak) }
          ]}>
            <MaterialCommunityIcons 
              name={item.icon} 
              size={24} 
              color="#FFFFFF" 
            />
          </View>
          <View style={styles.habitInfo}>
            <Text style={styles.habitTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.habitDescription} numberOfLines={1}>
                {item.description}
              </Text>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={() => toggleHabitComplete(item.id)}
        >
          <MaterialCommunityIcons 
            name={item.completedToday ? "check-circle" : "circle-outline"} 
            size={28} 
            color={item.completedToday ? "#4CAF50" : "#A3B8E8"} 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.habitStats}>
        <View style={styles.streakContainer}>
          <MaterialCommunityIcons 
            name="fire" 
            size={16} 
            color={getStreakColor(item.streak)} 
          />
          <Text style={[styles.streakText, { color: getStreakColor(item.streak) }]}>
            {item.streak} días seguidos
          </Text>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {Math.round((item.completedDays / (item.totalDays || 1)) * 100)}%
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { 
                  width: `${(item.completedDays / (item.totalDays || 1)) * 100}%`,
                  backgroundColor: getStreakColor(item.streak)
                }
              ]} 
            />
          </View>
        </View>
      </View>

      <View style={styles.habitActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleArchiveHabit(item.id)}
        >
          <MaterialCommunityIcons 
            name={item.archived ? "archive-arrow-up" : "archive-arrow-down"} 
            size={20} 
            color="#A3B8E8" 
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteHabit(item.id)}
        >
          <MaterialCommunityIcons 
            name="trash-can-outline" 
            size={20} 
            color="#FF6B6B" 
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
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Nombre del hábito"
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

          <Text style={styles.sectionTitle}>Ícono</Text>
          <View style={styles.iconGrid}>
            {HABIT_ICONS.map((icon) => (
              <TouchableOpacity
                key={icon.name}
                style={[
                  styles.iconButton,
                  selectedIcon === icon.name && styles.iconButtonSelected
                ]}
                onPress={() => setSelectedIcon(icon.name)}
              >
                <MaterialCommunityIcons 
                  name={icon.name} 
                  size={24} 
                  color={selectedIcon === icon.name ? "#1ADDDB" : "#A3B8E8"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Frecuencia</Text>
          <View style={styles.frequencyButtons}>
            <TouchableOpacity
              style={[
                styles.frequencyButton,
                frequency === 'daily' && styles.frequencyButtonSelected
              ]}
              onPress={() => setFrequency('daily')}
            >
              <MaterialCommunityIcons 
                name="calendar-today" 
                size={20} 
                color={frequency === 'daily' ? "#1ADDDB" : "#A3B8E8"} 
              />
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
              <MaterialCommunityIcons 
                name="calendar-week" 
                size={20} 
                color={frequency === 'weekly' ? "#1ADDDB" : "#A3B8E8"} 
              />
              <Text style={[
                styles.frequencyButtonText,
                frequency === 'weekly' && styles.frequencyButtonTextSelected
              ]}>Semanal</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Recordatorio</Text>
          <TouchableOpacity
            style={styles.reminderButton}
            onPress={() => setShowTimePicker(true)}
          >
            <MaterialCommunityIcons name="clock-outline" size={20} color="#1ADDDB" />
            <Text style={styles.reminderButtonText}>
              {reminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>

          {showTimePicker && (
            <DateTimePicker
              value={reminder}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  setReminder(selectedTime);
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
            <MaterialCommunityIcons 
              name="lightning-bolt" 
              size={16} 
              color={filterType === 'active' ? "#FFFFFF" : "#A3B8E8"} 
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
              name="archive" 
              size={16} 
              color={filterType === 'archived' ? "#FFFFFF" : "#A3B8E8"} 
            />
            <Text style={[
              styles.filterButtonText,
              filterType === 'archived' && styles.filterButtonTextActive
            ]}>Archivados</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#1ADDDB" style={styles.loader} />
      ) : (
        <FlatList
          data={habits.filter(habit => 
            filterType === 'active' ? !habit.archived : habit.archived
          )}
          renderItem={renderHabitItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons 
                name={filterType === 'active' ? "lightning-bolt" : "archive"} 
                size={40} 
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
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.addFirstButtonText}>Crear primer hábito</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <FloatingNavBar/>

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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
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
    gap: 16,
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
    gap: 12,
    flex: 1,
  },
  habitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  habitDescription: {
    fontSize: 14,
    color: '#A3B8E8',
  },
  habitStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  habitActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
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
    gap: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1ADDDB',
  },
  frequencyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  frequencyButtonSelected: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: '#1ADDDB',
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
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  addFirstButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  addFirstButtonText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Función auxiliar para obtener el color según la racha
const getStreakColor = (streak) => {
  if (streak >= 30) return '#FFD700'; // Oro
  if (streak >= 15) return '#C0C0C0'; // Plata
  if (streak >= 7) return '#CD7F32'; // Bronce
  return '#1ADDDB'; // Color base
};

export default HabitsScreen; 