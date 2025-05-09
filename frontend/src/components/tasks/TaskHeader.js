import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const TaskHeader = ({ filterType, onFilterChange }) => {
  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Tareas</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'all' && styles.filterButtonActive
            ]}
            onPress={() => onFilterChange('all')}
          >
            <Text>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'task' && styles.filterButtonActive
            ]}
            onPress={() => onFilterChange('task')}
          >
            <Text>Tareas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'reminder' && styles.filterButtonActive
            ]}
            onPress={() => onFilterChange('reminder')}
          >
            <Text>Recordatorios</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight,
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
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
