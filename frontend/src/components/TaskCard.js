import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated, StyleSheet 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { commonStyles, cardColors, CardHeader, EmptyState } from './common/CardStyles';
import * as Haptics from 'expo-haptics';

const API_URL = 'https://antobackend.onrender.com';

const TaskItem = memo(({ item, onPress }) => {
  const scaleAnim = new Animated.Value(1);
  const isTask = item.itemType === 'task';
  const isOverdue = new Date(item.dueDate) < new Date();

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
        style={[
          styles.taskCard,
          {
            backgroundColor: isOverdue 
              ? 'rgba(255, 107, 107, 0.1)' 
              : isTask 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(255, 107, 107, 0.05)',
            borderColor: isOverdue 
              ? 'rgba(255, 107, 107, 0.3)' 
              : isTask 
                ? 'rgba(26, 221, 219, 0.1)' 
                : 'rgba(255, 107, 107, 0.1)',
          }
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.taskContent}>
          {/* Icono y tipo */}
          <View style={styles.taskHeader}>
            <View style={[
              styles.iconContainer,
              {
                backgroundColor: isOverdue 
                  ? 'rgba(255, 107, 107, 0.2)' 
                  : isTask 
                    ? 'rgba(26, 221, 219, 0.2)' 
                    : 'rgba(255, 107, 107, 0.2)'
              }
            ]}>
              <MaterialCommunityIcons 
                name={isTask ? 'checkbox-blank-outline' : 'clock-outline'} 
                size={20} 
                color={isOverdue ? cardColors.error : isTask ? cardColors.primary : cardColors.error} 
              />
            </View>
            <View style={styles.typeContainer}>
              <Text style={styles.typeText}>
                {isTask ? 'Tarea' : 'Recordatorio'}
              </Text>
              {isOverdue && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>
                    {isTask ? 'Caducada' : 'Pasado'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Título y prioridad */}
          <View style={styles.taskBody}>
            <Text style={[
              styles.title,
              isOverdue && styles.overdueTitle
            ]} numberOfLines={1}>
              {item.title}
            </Text>
            {isTask && !isOverdue && (
              <View style={[styles.priorityBadge, { backgroundColor: priorityData.color }]}>
                <MaterialCommunityIcons 
                  name={priorityData.icon} 
                  size={12} 
                  color="#FFFFFF" 
                />
                <Text style={styles.priorityText}>
                  {priorityData.label}
                </Text>
              </View>
            )}
          </View>

          {/* Fecha y hora */}
          <View style={styles.taskFooter}>
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateContainer}>
                <MaterialCommunityIcons 
                  name="calendar" 
                  size={12} 
                  color={isOverdue ? cardColors.error : cardColors.secondary} 
                />
                <Text style={[
                  styles.dateText,
                  isOverdue && styles.overdueText
                ]}>
                  {new Date(item.dueDate).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short'
                  })}
                </Text>
              </View>
              <View style={styles.timeContainer}>
                <MaterialCommunityIcons 
                  name="clock-outline" 
                  size={12} 
                  color={isOverdue ? cardColors.error : cardColors.secondary} 
                />
                <Text style={[
                  styles.timeText,
                  isOverdue && styles.overdueText
                ]}>
                  {new Date(item.dueDate).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons 
              name="chevron-right" 
              size={20} 
              color={cardColors.secondary} 
            />
          </View>
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

const styles = StyleSheet.create({
  taskCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  taskContent: {
    gap: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeText: {
    color: cardColors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  taskBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 12,
  },
  overdueTitle: {
    color: cardColors.error,
    textDecorationLine: 'line-through',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  priorityText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateText: {
    color: cardColors.secondary,
    fontSize: 12,
  },
  timeText: {
    color: cardColors.secondary,
    fontSize: 12,
  },
  overdueBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  overdueText: {
    color: cardColors.error,
    fontSize: 12,
    fontWeight: '500',
  },
});

export default TaskCard;
  