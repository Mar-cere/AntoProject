import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import FloatingNavBar from '../components/FloatingNavBar';
import TaskHeader from '../components/tasks/TaskHeader';
import TaskItem from '../components/tasks/TaskItem';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import { API_URL } from '../config/api';

const PRIORITY_VALUES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const TaskScreen = ({ route }) => {
  // Estados
  const [state, setState] = useState({
    items: [],
    loading: true,
    filterType: 'all',
    modalVisible: false,
    selectedItem: null,
    detailModalVisible: false
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date(),
    itemType: 'task',
    priority: 'medium',
    completed: false
  });

  const navigation = useNavigation();

  // Cargar items desde la API
  const loadItems = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Error al obtener las tareas');

      const data = await response.json();
      setState(prev => ({ 
        ...prev, 
        items: data,
        loading: false 
      }));
    } catch (error) {
      console.error('Error al cargar items:', error);
      Alert.alert('Error', 'No se pudieron cargar los items');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  // Efecto para cargar datos iniciales
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Efecto para manejar apertura automática del modal
  useEffect(() => {
    const { mode, taskId, task } = route.params || {};
    
    if (mode === 'view' && taskId) {
      // Mostrar detalles de la tarea
      setState(prev => ({ ...prev, selectedItem: task, detailModalVisible: true }));
    } else if (mode === 'create') {
      // Mostrar modal de creación
      setState(prev => ({ ...prev, modalVisible: true }));
    }
  }, [route.params]);

  // Handlers
  const handleAddItem = async (formData) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No hay sesión activa');
        navigation.navigate('SignIn');
        return;
      }

      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Error al crear la tarea');

      const createdTask = await response.json();
      setState(prev => ({
        ...prev,
        items: [...prev.items, createdTask],
        modalVisible: false
      }));
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo crear la tarea');
    }
  };

  const handleToggleComplete = async (id) => {
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
      setState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item._id === id ? updatedTask : item
        )
      }));
      
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo actualizar la tarea');
    }
  };

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

              setState(prev => ({
                ...prev,
                items: prev.items.filter(item => item._id !== id)
              }));
              
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (error) {
              console.error('Error:', error);
              Alert.alert('Error', 'No se pudo eliminar la tarea');
            }
          }
        }
      ]
    );
  };

  const handleSubmit = async (data) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // Preparar los datos según el tipo
      const endpoint = data.itemType === 'task' ? '/api/tasks' : '/api/tasks'; // Usamos la misma ruta
      const requestData = {
        title: data.title,
        dueDate: data.dueDate,
        isReminder: data.itemType === 'reminder', // Agregamos esta bandera
        // Si es una tarea, incluimos campos adicionales
        ...(data.itemType === 'task' && {
          description: data.description,
          priority: data.priority,
        }),
        completed: false
      };

      console.log('Enviando datos:', requestData); // Para debug

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Error response:', errorData);
        throw new Error(data.itemType === 'task' 
          ? 'Error al crear la tarea' 
          : 'Error al crear el recordatorio');
      }

      // Cerrar el modal y actualizar la lista
      setState(prev => ({ ...prev, modalVisible: false }));
      loadItems(); // Recargar las tareas/recordatorios
      
      // Mostrar mensaje de éxito
      Alert.alert(
        'Éxito',
        data.itemType === 'task' 
          ? 'Tarea creada correctamente' 
          : 'Recordatorio creado correctamente'
      );
    } catch (error) {
      console.error('Error completo:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      
      {/* Header Fijo */}
      <View style={styles.headerFixed}>
        <TaskHeader 
          filterType={state.filterType}
          onFilterChange={(type) => setState(prev => ({ ...prev, filterType: type }))}
        />
      </View>

      {/* Contenido Scrolleable */}
      <View style={styles.content}>
        <FlatList
          data={state.items.filter(item => 
            state.filterType === 'all' ? true : item.type === state.filterType
          )}
          renderItem={({ item }) => (
            <TaskItem
              item={item}
              onPress={(item) => setState(prev => ({ 
                ...prev, 
                selectedItem: item,
                detailModalVisible: true 
              }))}
              onToggleComplete={handleToggleComplete}
              onDelete={handleDeleteItem}
            />
          )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
          // Agregamos pull-to-refresh
          refreshing={state.loading}
          onRefresh={loadItems}
      />
      </View>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setState(prev => ({ ...prev, modalVisible: true }))}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <CreateTaskModal
        visible={state.modalVisible}
        onClose={() => setState(prev => ({ ...prev, modalVisible: false }))}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
      />

      <FloatingNavBar activeTab="calendar" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  headerFixed: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    paddingTop: StatusBar.currentHeight || 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
    zIndex: 2,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingTop: 8, // Reducido porque ya tenemos el header fijo
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 100, // Ajustado para dar espacio al FloatingNavBar
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
    zIndex: 3,
  }
});

export default TaskScreen; 