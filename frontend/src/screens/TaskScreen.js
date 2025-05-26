import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert, StatusBar, Platform, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import FloatingNavBar from '../components/FloatingNavBar';
import TaskHeader from '../components/tasks/TaskHeader';
import TaskItem from '../components/tasks/TaskItem';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import { API_URL } from '../config/api';
import { scheduleTaskNotification, cancelTaskNotifications } from '../utils/notifications';

const PRIORITY_VALUES = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const TaskScreen = ({ route }) => {
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
    completed: false,
    notifications: []
  });

  const navigation = useNavigation();

  // Cargar items desde la API
  const loadItems = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/tasks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Error al obtener las tareas');
      const data = await response.json();
      const sortedItems = data.sort((a, b) => {
        if (a.itemType !== b.itemType) {
          return a.itemType === 'reminder' ? -1 : 1;
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      setState(prev => ({
        ...prev,
        items: sortedItems,
        loading: false
      }));
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los items');
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    const { mode, task, taskId } = route.params || {};
    if (mode === 'view' && taskId) {
      setState(prev => ({ ...prev, selectedItem: task, detailModalVisible: true }));
    } else if (mode === 'create') {
      setState(prev => ({ ...prev, modalVisible: true }));
    }
  }, [route.params]);

  // Crear tarea o recordatorio
  const handleSubmit = async (data) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const requestData = {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        itemType: data.itemType,
        repeat: data.repeat,
        notifications: data.notifications
      };
      const response = await fetch(`${API_URL}/api/tasks`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
      if (!response.ok) throw new Error('Error al crear la tarea');
      const responseJson = await response.json();
      setState(prev => ({ ...prev, modalVisible: false }));
      await scheduleTaskNotification(responseJson.data);
      loadItems();
      Alert.alert('Éxito', data.itemType === 'task' ? 'Tarea creada correctamente' : 'Recordatorio creado correctamente');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  // Función unificada para marcar como completado (tanto tareas como recordatorios)
  const handleToggleComplete = async (id) => {
    if (!id) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/tasks/${id}/complete`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el item');
      }

      const updatedItem = await response.json();
      
      // Actualizar estado para mostrar item completado
      setState(prev => ({
        ...prev,
        items: prev.items.map(item => 
          item._id === id ? updatedItem.data : item
        )
      }));

      // Feedback háptico de completado
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await cancelTaskNotifications(id);

      // Esperar 3.5 segundos antes de eliminar
      setTimeout(async () => {
        try {
          const deleteResponse = await fetch(`${API_URL}/api/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!deleteResponse.ok) {
            throw new Error('Error al eliminar el item');
          }

          // Actualizar estado para remover el item
          setState(prev => ({
            ...prev,
            items: prev.items.filter(item => item._id !== id)
          }));

          // Feedback háptico de eliminación
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          console.error('Error al eliminar item completado:', error);
          Alert.alert('Error', 'No se pudo eliminar el item completado');
        }
      }, 3500);
      
    } catch (error) {
      console.error('Error al completar item:', error);
      Alert.alert('Error', 'No se pudo actualizar el item');
    }
  };

  // Eliminar tarea o recordatorio
  const handleDeleteItem = async (id) => {
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
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (!response.ok) throw new Error('Error al eliminar tarea');
              setState(prev => ({
                ...prev,
                items: prev.items.filter(item => item._id !== id)
              }));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await cancelTaskNotifications(id);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la tarea');
            }
          }
        }
      ]
    );
  };

  // Filtrado de items
  const filteredItems = Array.isArray(state.items)
    ? state.items.filter(item =>
        state.filterType === 'all' ? true : item.itemType === state.filterType
      )
    : [];

  // Mensaje si no hay tareas
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="checkmark-done-circle-outline" size={64} color="#A3B8E8" />
      <Text style={styles.emptyText}>No tienes tareas ni recordatorios</Text>
      </View>
  );

  return (
    <View style={styles.container}>
      <TaskHeader 
        filterType={state.filterType}
        onFilterChange={type => setState(prev => ({ ...prev, filterType: type }))}
      />
      <FlatList
        data={filteredItems}
        renderItem={({ item }) => (
          <TaskItem
            key={item._id}
            item={item}
            onPress={item => setState(prev => ({ ...prev, selectedItem: item, detailModalVisible: true }))}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteItem}
          />
        )}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={state.loading}
        onRefresh={loadItems}
        ListEmptyComponent={renderEmpty}
      />
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
  container: { flex: 1, backgroundColor: '#030A24' },
  listContainer: { padding: 16, gap: 12, paddingBottom: 100 },
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
    zIndex: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 64,
    opacity: 0.7,
  },
  emptyText: {
    color: '#A3B8E8',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
});

export default TaskScreen; 