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
  Animated,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import FloatingNavBar from '../components/FloatingNavBar';

const API_URL = 'https://antobackend.onrender.com';

// Modificar las constantes de prioridad
const PRIORITY_VALUES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const TaskScreen = ({ route }) => {
  // Estados
  const [items, setItems] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [itemType, setItemType] = useState('task'); // 'task' o 'reminder'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [priority, setPriority] = useState(PRIORITY_VALUES.MEDIUM); // 1: Alta, 2: Media, 3: Baja
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all', 'tasks', 'reminders'
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const navigation = useNavigation();

  // Manejar apertura automática del modal
  useEffect(() => {
    if (route.params?.openModal) {
      setModalVisible(true);
      // Limpiar el parámetro para futuras navegaciones
      navigation.setParams({ openModal: undefined });
    }
  }, [route.params?.openModal]);

  // Cargar items desde la API
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener las tareas');
      }

      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Error al cargar items:', error);
      Alert.alert('Error', 'No se pudieron cargar los items');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, []);

  // Guardar items
  const saveItems = async (newItems) => {
    try {
      await AsyncStorage.setItem('items', JSON.stringify(newItems));
    } catch (error) {
      console.error('Error al guardar items:', error);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    }
  };

  // Agregar nuevo item usando la API
  const handleAddItem = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Por favor ingresa un título');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No hay sesión activa');
        navigation.navigate('SignIn');
        return;
      }

      // Simplificamos al máximo los datos enviados
      const newItem = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString(),
        priority: 'medium' // Valor fijo para prueba
      };

      console.log('Token:', token);
      console.log('Enviando datos:', newItem);

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newItem)
      });

      console.log('Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Error al crear la tarea');
      }

      const createdTask = await response.json();
      console.log('Tarea creada:', createdTask);
      
      setItems(prevItems => [...prevItems, createdTask]);
      setModalVisible(false);
      resetForm();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('Error completo:', error);
      Alert.alert(
        'Error',
        'No se pudo crear la tarea. Por favor, verifica tu conexión e inténtalo de nuevo.'
      );
    }
  };

  // Eliminar item usando la API
  const handleDeleteItem = (id) => {
    Alert.alert(
      'Confirmar eliminación',
      '¿Estás seguro de que deseas eliminar este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/tasks/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) throw new Error('Error al eliminar tarea');

              setItems(prevItems => prevItems.filter(item => item._id !== id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (error) {
              console.error('Error al eliminar item:', error);
              Alert.alert('Error', 'No se pudo eliminar el item');
            }
          }
        }
      ]
    );
  };

  // Marcar como completado usando la API
  const toggleItemComplete = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/tasks/${id}/complete`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al actualizar tarea');
      
      const updatedTask = await response.json();
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === id ? updatedTask : item
        )
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error al actualizar item:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado del item');
    }
  };

  // Actualizar item usando la API
  const handleUpdateItem = async (id, updatedData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!response.ok) throw new Error('Error al actualizar tarea');
      
      const updatedTask = await response.json();
      setItems(prevItems =>
        prevItems.map(item =>
          item._id === id ? updatedTask : item
        )
      );
    } catch (error) {
      console.error('Error al actualizar item:', error);
      Alert.alert('Error', 'No se pudo actualizar el item');
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate(new Date());
    setPriority(PRIORITY_VALUES.MEDIUM);
    setItemType('task');
  };

  // Modificar la función que maneja el tap en una tarea
  const handleItemPress = (item) => {
    setSelectedItem(item);
    setDetailModalVisible(true);
  };

  // Renderizar item
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.itemCard, item.completed && styles.completedItem]}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Ionicons 
            name={item.type === 'task' ? 'tasks' : 'clock'} 
            size={16} 
            color="#1ADDDB" 
          />
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => toggleItemComplete(item._id)}
          >
            <Ionicons 
              name={item.completed ? 'check-circle' : 'circle'} 
              size={24} 
              color={item.completed ? '#4CAF50' : '#A3B8E8'} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item._id)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemDetails}>
        {item.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        
        <View style={styles.itemFooter}>
          <View style={styles.itemMetadata}>
            <Ionicons name="calendar-outline" size={12} color="#A3B8E8" />
            <Text style={styles.itemDate}>
              {new Date(item.dueDate).toLocaleDateString()}
            </Text>
          </View>
          <View style={[
            styles.priorityBadge,
            { backgroundColor: getPriorityColor(item.priority) }
          ]}>
            <Text style={styles.priorityText}>
              {getPriorityText(item.priority)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Actualizar el renderizado de los botones de prioridad
  const priorityButtons = [
    { value: PRIORITY_VALUES.HIGH, label: 'Alta' },
    { value: PRIORITY_VALUES.MEDIUM, label: 'Media' },
    { value: PRIORITY_VALUES.LOW, label: 'Baja' }
  ];

  // Renderizar modal de nuevo item
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
            <Text style={styles.modalTitle}>
              {itemType === 'task' ? 'Nueva Tarea' : 'Nuevo Recordatorio'}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                setModalVisible(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <View style={styles.typeSelector}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                itemType === 'task' && styles.typeButtonActive
              ]}
              onPress={() => setItemType('task')}
            >
              <Ionicons name="tasks" size={16} color={itemType === 'task' ? '#1ADDDB' : '#A3B8E8'} />
              <Text style={[
                styles.typeButtonText,
                itemType === 'task' && styles.typeButtonTextActive
              ]}>Tarea</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.typeButton,
                itemType === 'reminder' && styles.typeButtonActive
              ]}
              onPress={() => setItemType('reminder')}
            >
              <Ionicons name="clock" size={16} color={itemType === 'reminder' ? '#1ADDDB' : '#A3B8E8'} />
              <Text style={[
                styles.typeButtonText,
                itemType === 'reminder' && styles.typeButtonTextActive
              ]}>Recordatorio</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={16} color="#1ADDDB" />
            <Text style={styles.dateButtonText}>
              {dueDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDueDate(selectedDate);
                }
              }}
              minimumDate={new Date()}
            />
          )}

          <View style={styles.prioritySelector}>
            <Text style={styles.priorityLabel}>Prioridad:</Text>
            <View style={styles.priorityButtons}>
              {priorityButtons.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.priorityButton,
                    priority === p.value && styles.priorityButtonActive,
                    { backgroundColor: getPriorityColor(p.value) }
                  ]}
                  onPress={() => setPriority(p.value)}
                >
                  <Text style={styles.priorityButtonText}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddItem}
          >
            <Text style={styles.addButtonText}>
              {itemType === 'task' ? 'Agregar Tarea' : 'Agregar Recordatorio'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  // Agregar el modal de detalle
  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.detailModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Ionicons 
                name={selectedItem?.type === 'task' ? 'tasks' : 'clock'} 
                size={20} 
                color="#1ADDDB" 
              />
              <Text style={styles.modalTitle}>
                {selectedItem?.type === 'task' ? 'Detalle de Tarea' : 'Detalle de Recordatorio'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailModalVisible(false)}
            >
              <Ionicons name="close" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Título</Text>
              <Text style={styles.detailTitle}>{selectedItem?.title}</Text>
            </View>

            {selectedItem?.description ? (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Descripción</Text>
                <Text style={styles.detailDescription}>
                  {selectedItem.description}
                </Text>
              </View>
            ) : null}

            <View style={styles.detailRow}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Fecha</Text>
                <View style={styles.detailValueContainer}>
                  <Ionicons name="calendar" size={14} color="#1ADDDB" />
                  <Text style={styles.detailValue}>
                    {new Date(selectedItem?.dueDate).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Prioridad</Text>
                <View style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(selectedItem?.priority) }
                ]}>
                  <Text style={styles.priorityText}>
                    {getPriorityText(selectedItem?.priority)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.detailActionButton, styles.completeButton]}
                onPress={() => {
                  toggleItemComplete(selectedItem?._id);
                  setDetailModalVisible(false);
                }}
              >
                <Ionicons 
                  name={selectedItem?.completed ? 'check-circle' : 'circle'} 
                  size={20} 
                  color="#FFFFFF" 
                />
                <Text style={styles.detailActionText}>
                  {selectedItem?.completed ? 'Marcar como pendiente' : 'Marcar como completada'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.detailActionButton, styles.deleteButton]}
                onPress={() => {
                  setDetailModalVisible(false);
                  handleDeleteItem(selectedItem?._id);
                }}
              >
                <Ionicons name="trash" size={20} color="#FFFFFF" />
                <Text style={styles.detailActionText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Items</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[
              styles.filterButtonText,
              filterType === 'all' && styles.filterButtonTextActive
            ]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'tasks' && styles.filterButtonActive]}
            onPress={() => setFilterType('tasks')}
          >
            <Text style={[
              styles.filterButtonText,
              filterType === 'tasks' && styles.filterButtonTextActive
            ]}>Tareas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'reminders' && styles.filterButtonActive]}
            onPress={() => setFilterType('reminders')}
          >
            <Text style={[
              styles.filterButtonText,
              filterType === 'reminders' && styles.filterButtonTextActive
            ]}>Recordatorios</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items.filter(item => 
          filterType === 'all' ? true : item.type === filterType
        )}
        renderItem={renderItem}
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
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <FloatingNavBar/>
      {renderModal()}
      {renderDetailModal()}
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
  itemCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  completedItem: {
    opacity: 0.7,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDetails: {
    gap: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#A3B8E8',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  itemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemDate: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
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
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  typeButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#1ADDDB',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
  },
  dateButtonText: {
    color: '#1ADDDB',
    fontSize: 16,
  },
  prioritySelector: {
    gap: 8,
  },
  priorityLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
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
  detailModalContent: {
    backgroundColor: '#1D2B5F',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailContent: {
    marginTop: 16,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#A3B8E8',
    marginBottom: 4,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailDescription: {
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailValue: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  detailActions: {
    marginTop: 24,
    gap: 12,
  },
  detailActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  detailActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

// Actualizar la función getPriorityColor
const getPriorityColor = (priority) => {
  switch (priority) {
    case PRIORITY_VALUES.HIGH: return '#FF6B6B'; // Alta
    case PRIORITY_VALUES.MEDIUM: return '#FFD93D'; // Media
    case PRIORITY_VALUES.LOW: return '#6BCB77'; // Baja
    default: return '#95A5A6';
  }
};

// Actualizar la función getPriorityText
const getPriorityText = (priority) => {
  switch (priority) {
    case PRIORITY_VALUES.HIGH: return 'Alta';
    case PRIORITY_VALUES.MEDIUM: return 'Media';
    case PRIORITY_VALUES.LOW: return 'Baja';
    default: return 'Normal';
  }
};

export default TaskScreen; 