import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commonStyles, cardColors, CardHeader, EmptyState } from './common/CardStyles';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://antobackend.onrender.com';

const TaskItem = memo(({ item, onPress }) => {
  const scaleAnim = new Animated.Value(1);

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

  const getPriorityData = (priority) => {
    const priorities = {
      high: { color: cardColors.error, icon: 'alert-circle', label: 'Alta' },
      medium: { color: cardColors.warning, icon: 'alert', label: 'Media' },
      low: { color: cardColors.success, icon: 'check-circle', label: 'Baja' },
    };
    return priorities[priority] || priorities.medium;
  };

  const priorityData = getPriorityData(item.priority);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[commonStyles.itemContainer, {
          backgroundColor: item.itemType === 'reminder' 
            ? 'rgba(255, 107, 107, 0.1)' 
            : 'rgba(255, 255, 255, 0.05)',
        }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.taskContent}>
          {/* Indicador de prioridad */}
          <View style={[styles.priorityBadge, { backgroundColor: priorityData.color }]}>
            <MaterialCommunityIcons 
              name={priorityData.icon} 
              size={12} 
              color="#FFFFFF" 
            />
          </View>

          {/* Contenido principal */}
          <View style={styles.mainContent}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons 
                name={item.itemType === 'reminder' ? 'clock-outline' : 'checkbox-blank-outline'} 
                size={20} 
                color={item.itemType === 'reminder' ? cardColors.error : cardColors.primary} 
              />
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
            </View>

            {/* Información adicional */}
            <View style={styles.detailsRow}>
              <View style={styles.tagContainer}>
                <Text style={styles.tagText}>
                  {item.itemType === 'reminder' ? 'Recordatorio' : 'Tarea'}
                </Text>
              </View>
              {item.dueDate && (
                <View style={styles.dateContainer}>
                  <MaterialCommunityIcons 
                    name="calendar" 
                    size={12} 
                    color={cardColors.secondary} 
                  />
                  <Text style={styles.dateText}>
                    {new Date(item.dueDate).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Flecha de navegación */}
          <MaterialCommunityIcons 
            name="chevron-right" 
            size={20} 
            color={cardColors.secondary} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const TaskCard = memo(() => {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar tareas
  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      console.log('Intentando cargar items pendientes con token:', token);

      const response = await fetch(`${API_URL}/api/tasks/pending`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status} - ${responseText}`);
      }

      const data = JSON.parse(responseText);
      // Ordenar por fecha y tipo (recordatorios primero)
      const sortedItems = data.sort((a, b) => {
        if (a.itemType !== b.itemType) {
          return a.itemType === 'reminder' ? -1 : 1;
        }
        return new Date(a.dueDate) - new Date(b.dueDate);
      });
      setItems(sortedItems);
    } catch (error) {
      console.error('Error completo:', error);
      if (error.message.includes('401') || error.message.includes('403')) {
        // Si es error de autenticación, redirigir al login
        Alert.alert('Sesión expirada', 'Por favor, inicia sesión nuevamente');
        // Limpiar el token
        await AsyncStorage.removeItem('userToken');
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
      } else {
        Alert.alert('Error', 'No se pudieron cargar los items');
      }
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  useEffect(() => {
    loadItems();
  }, []);

  const handleItemPress = useCallback((item) => {
    navigation.navigate('Tasks', { 
      screen: 'TaskDetails',
      params: {
        taskId: item._id,
        task: item,
        mode: 'view',
        itemType: item.itemType
      }
    });
  }, [navigation]);

  return (
    <View style={commonStyles.cardContainer}>
      <CardHeader 
        icon="format-list-checks"
        title="Mis Pendientes"
        onViewAll={() => navigation.navigate('Tasks', { mode: 'list' })}
      />

      {loading ? (
        <ActivityIndicator color={cardColors.primary} style={commonStyles.loader} />
      ) : items.length > 0 ? (
        <View style={styles.tasksContainer}>
          {items.map((item) => (
            <TaskItem
              key={item._id}
              item={item}
              onPress={() => handleItemPress(item)}
            />
          ))}
        </View>
      ) : (
        <EmptyState 
          icon="clipboard-text-outline"
          message="No hay tareas pendientes"
          onAdd={() => navigation.navigate('Tasks', { mode: 'create', openModal: true })}
          addButtonText="Agregar tarea"
        />
      )}
    </View>
  );
});

const styles = {
  tasksContainer: {
    gap: 8,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagContainer: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: cardColors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: cardColors.secondary,
    fontSize: 12,
  }
};

export default TaskCard;
  