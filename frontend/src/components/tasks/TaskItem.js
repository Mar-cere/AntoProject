import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TaskItem = ({ item, onPress, onToggleComplete, onDelete }) => {
  const isTask = item.itemType === 'task';
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Función para verificar si está caducado (tanto tareas como recordatorios)
  const isOverdue = () => {
    return new Date(item.dueDate) < new Date();
  };

  // Función para determinar el estado del ítem
  const getItemState = () => {
    if (item.completed) return 'completed';
    if (isOverdue()) return 'overdue';
    return 'pending';
  };

  const itemState = getItemState();

  useEffect(() => {
    if (item.completed) {
      // Animación unificada para tareas y recordatorios
      Animated.sequence([
        // Primero reducimos la opacidad a 0.7
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 300,
          useNativeDriver: true,
        }),
        // Esperamos 2 segundos
        Animated.delay(2000),
        // Reducimos más la opacidad
        Animated.timing(fadeAnim, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [item.completed]);

  if (!item) {
    console.warn('TaskItem: item es undefined');
    return null;
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={[
          styles.itemCard,
          itemState === 'completed' && styles.completedItem,
          itemState === 'overdue' && styles.overdueItem
        ]}
        onPress={() => onPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <View style={[
              styles.iconContainer,
              { 
                backgroundColor: itemState === 'overdue' 
                  ? 'rgba(255, 107, 107, 0.1)' 
                  : isTask 
                    ? 'rgba(26, 221, 219, 0.1)' 
                    : 'rgba(255, 107, 107, 0.1)'
              }
            ]}>
              <Ionicons 
                name={isTask ? 'checkbox-outline' : 'alarm-outline'} 
                size={18} 
                color={itemState === 'overdue' ? '#FF6B6B' : isTask ? '#1ADDDB' : '#FF6B6B'} 
              />
            </View>
            <Text style={[
              styles.itemTitle,
              itemState === 'completed' && styles.completedTitle,
              itemState === 'overdue' && styles.overdueTitle
            ]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
          <View style={styles.itemActions}>
            {itemState === 'pending' && (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={() => onToggleComplete(item._id)}
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
              onPress={() => onDelete(item._id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemDetails}>
          {item.description ? (
            <Text style={[
              styles.itemDescription,
              itemState === 'completed' && styles.completedDescription,
              itemState === 'overdue' && styles.overdueDescription
            ]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          
          <View style={styles.itemFooter}>
            <View style={styles.itemMetadata}>
              <View style={[
                styles.dateContainer,
                itemState === 'overdue' && styles.overdueDateContainer
              ]}>
                <Ionicons 
                  name="calendar-outline" 
                  size={12} 
                  color={itemState === 'overdue' ? '#FF6B6B' : '#A3B8E8'} 
                />
                <Text style={[
                  styles.itemDate,
                  itemState === 'overdue' && styles.overdueDate
                ]}>
                  {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={[
                styles.timeContainer,
                itemState === 'overdue' && styles.overdueDateContainer
              ]}>
                <Ionicons 
                  name="time-outline" 
                  size={12} 
                  color={itemState === 'overdue' ? '#FF6B6B' : '#A3B8E8'} 
                />
                <Text style={[
                  styles.itemDate,
                  itemState === 'overdue' && styles.overdueDate
                ]}>
                  {new Date(item.dueDate).toLocaleTimeString([], { 
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
                  <Text style={styles.priorityText}>
                    {getPriorityText(item.priority)}
                  </Text>
                </View>
              )}
              {itemState === 'overdue' && (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueText}>
                    {isTask ? 'Caducada' : 'Pasado'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  completedItem: {
    opacity: 0.7,
    backgroundColor: 'rgba(29, 43, 95, 0.4)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  completedTitle: {
    color: '#A3B8E8',
    textDecorationLine: 'line-through',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  completeButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  completedButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  itemDetails: {
    gap: 12,
  },
  itemDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    lineHeight: 20,
  },
  completedDescription: {
    color: '#A3B8E8',
    opacity: 0.7,
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
    gap: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemDate: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
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
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  overdueText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '500',
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

const getPriorityText = (priority) => {
  switch (priority) {
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Baja';
    default: return 'Normal';
  }
};

export default TaskItem; 