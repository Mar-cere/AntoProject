import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const TaskHeader = ({ filterType, onFilterChange }) => {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Mis Tareas</Text>
      <View style={styles.filterButtons}>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => onFilterChange('all')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'all' && styles.filterButtonTextActive
          ]}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'tasks' && styles.filterButtonActive]}
          onPress={() => onFilterChange('tasks')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'tasks' && styles.filterButtonTextActive
          ]}>Tareas</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'reminders' && styles.filterButtonActive]}
          onPress={() => onFilterChange('reminders')}
        >
          <Text style={[
            styles.filterButtonText,
            filterType === 'reminders' && styles.filterButtonTextActive
          ]}>Recordatorios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: 'rgba(29, 43, 95, 0.1)',
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
});

export default TaskHeader;
