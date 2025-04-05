import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TaskItem = ({ item, onPress, onToggleComplete, onDelete }) => {
  return (
    <TouchableOpacity
      style={[styles.itemCard, item.completed && styles.completedItem]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleContainer}>
          <Ionicons 
            name={item.type === 'task' ? 'checkbox-outline' : 'alarm-outline'} 
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
            onPress={() => onToggleComplete(item._id)}
          >
            <Ionicons 
              name={item.completed ? 'checkmark-circle' : 'ellipse-outline'} 
              size={24} 
              color={item.completed ? '#4CAF50' : '#A3B8E8'} 
            />
          </TouchableOpacity>
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
            <Ionicons name="time-outline" size={12} color="#A3B8E8" />
            <Text style={styles.itemDate}>
              {new Date(item.dueDate).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
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
};

const styles = StyleSheet.create({
  itemCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    marginBottom: 12,
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
  completeButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  itemDetails: {
    gap: 8,
  },
  itemDescription: {
    fontSize: 14,
    color: '#A3B8E8',
    lineHeight: 20,
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