import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TaskItem = ({ item, onPress, onToggleComplete, onDelete }) => {
  const isTask = item.itemType === 'task';
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Función para verificar si está caducado
  const isOverdue = useCallback(() => {
    return new Date(item.dueDate) < new Date();
  }, [item.dueDate]);

  // Función para determinar el estado del ítem
  const getItemState = useCallback(() => {
    if (item.completed) return 'completed';
    if (isOverdue()) return 'overdue';
    return 'pending';
  }, [item.completed, isOverdue]);

  const itemState = getItemState();

  // Animación de entrada
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  // Animación cuando se completa
  useEffect(() => {
    if (item.completed) {
      Animated.sequence([
        // Primero reducimos la opacidad a 0.8
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
        // Esperamos 2 segundos
        Animated.delay(2000),
        // Reducimos más la opacidad
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [item.completed, fadeAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(item);
  }, [onPress, item]);

  const handleToggleComplete = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await onToggleComplete(item._id);
  }, [onToggleComplete, item._id]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de que deseas eliminar este ${isTask ? 'tarea' : 'recordatorio'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onDelete(item._id);
          }
        }
      ]
    );
  }, [onDelete, item._id, isTask]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  }, [scaleAnim]);

  if (!item) {
    console.warn('TaskItem: item es undefined');
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              })
            }
          ]
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.itemCard,
          itemState === 'completed' && styles.completedItem,
          itemState === 'overdue' && styles.overdueItem
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <View style={[
              styles.iconContainer,
              { 
                backgroundColor: itemState === 'overdue' 
                  ? 'rgba(255, 107, 107, 0.15)' 
                  : isTask 
                    ? 'rgba(26, 221, 219, 0.15)' 
                    : 'rgba(255, 107, 107, 0.15)'
              }
            ]}>
              <Ionicons 
                name={isTask ? 'checkbox-outline' : 'alarm-outline'} 
                size={20} 
                color={itemState === 'overdue' ? '#FF6B6B' : isTask ? '#1ADDDB' : '#FF6B6B'} 
              />
            </View>
            <View style={styles.titleContainer}>
              <Text style={[
                styles.itemTitle,
                itemState === 'completed' && styles.completedTitle,
                itemState === 'overdue' && styles.overdueTitle
              ]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.description && (
                <Text style={[
                  styles.itemDescription,
                  itemState === 'completed' && styles.completedDescription,
                  itemState === 'overdue' && styles.overdueDescription
                ]} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.itemActions}>
            {itemState === 'pending' && (
              <TouchableOpacity
                style={[
                  styles.completeButton,
                  item.completed && styles.completedButton
                ]}
                onPress={handleToggleComplete}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} 
                  size={24} 
                  color={item.completed ? '#4CAF50' : '#A3B8E8'} 
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemFooter}>
          <View style={styles.itemMetadata}>
            <View style={[
              styles.dateContainer,
              itemState === 'overdue' && styles.overdueDateContainer
            ]}>
              <Ionicons 
                name="calendar-outline" 
                size={14} 
                color={itemState === 'overdue' ? '#FF6B6B' : '#A3B8E8'} 
              />
              <Text style={[
                styles.itemDate,
                itemState === 'overdue' && styles.overdueDate
              ]}>
                {new Date(item.dueDate).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short'
                })}
              </Text>
            </View>
            <View style={[
              styles.timeContainer,
              itemState === 'overdue' && styles.overdueDateContainer
            ]}>
              <Ionicons 
                name="time-outline" 
                size={14} 
                color={itemState === 'overdue' ? '#FF6B6B' : '#A3B8E8'} 
              />
              <Text style={[
                styles.itemDate,
                itemState === 'overdue' && styles.overdueDate
              ]}>
                {new Date(item.dueDate).toLocaleTimeString('es-ES', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                })}
              </Text>
            </View>
          </View>
          <View style={styles.badgeContainer}>
            {isTask && itemState === 'pending' && (
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(item.priority) }
              ]}>
                <Ionicons 
                  name={getPriorityIcon(item.priority)} 
                  size={12} 
                  color="#FFFFFF" 
                />
                <Text style={styles.priorityText}>
                  {getPriorityText(item.priority)}
                </Text>
              </View>
            )}
            {itemState === 'overdue' && (
              <View style={styles.overdueBadge}>
                <Ionicons name="alert-circle" size={12} color="#FF6B6B" />
                <Text style={styles.overdueText}>
                  {isTask ? 'Caducada' : 'Pasado'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  itemCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completedItem: {
    opacity: 0.7,
    backgroundColor: 'rgba(29, 43, 95, 0.4)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  completedTitle: {
    color: '#A3B8E8',
    textDecorationLine: 'line-through',
  },
  itemDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    lineHeight: 18,
    opacity: 0.8,
  },
  completedDescription: {
    color: '#A3B8E8',
    opacity: 0.5,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  completeButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  completedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  itemDate: {
    fontSize: 12,
    color: '#A3B8E8',
    fontWeight: '500',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overdueItem: {
    borderColor: 'rgba(255, 107, 107, 0.3)',
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
  },
  overdueTitle: {
    color: '#FF6B6B',
    textDecorationLine: 'line-through',
  },
  overdueDescription: {
    color: '#FF6B6B',
    opacity: 0.7,
  },
  overdueDateContainer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  overdueDate: {
    color: '#FF6B6B',
  },
  overdueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  overdueText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
  }
});

// Funciones auxiliares para el manejo de prioridades
const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#FF6B6B';
    case 'medium': return '#FFD93D';
    case 'low': return '#6BCB77';
    default: return '#95A5A6';
  }
};

const getPriorityIcon = (priority) => {
  switch (priority) {
    case 'high': return 'alert-circle';
    case 'medium': return 'alert';
    case 'low': return 'checkmark-circle';
    default: return 'help-circle';
  }
};

const getPriorityText = (priority) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Baja';
    default: return 'Normal';
  }
};

export default TaskItem; 