import React, { useState, useCallback } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, TextInput, Animated 
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const TaskHeader = ({ filterType, onFilterChange, onSearch, searchQuery = '' }) => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchAnim = new Animated.Value(0);

  const toggleSearch = useCallback(() => {
    Animated.spring(searchAnim, {
      toValue: isSearchVisible ? 0 : 1,
      useNativeDriver: false,
    }).start();
    setIsSearchVisible(!isSearchVisible);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isSearchVisible, searchAnim]);

  const handleFilterChange = useCallback((type) => {
    onFilterChange(type);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onFilterChange]);

  const getFilterCount = useCallback((type) => {
    // Esta función podría recibir los conteos como props si es necesario
    return null;
  }, []);

  return (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mis Tareas</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={toggleSearch}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons 
              name={isSearchVisible ? "close" : "magnify"} 
              size={24} 
              color="#A3B8E8" 
            />
          </TouchableOpacity>
        </View>

        <Animated.View 
          style={[
            styles.searchContainer,
            {
              height: searchAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 50],
              }),
              opacity: searchAnim,
            }
          ]}
        >
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color="#A3B8E8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar tareas..."
              placeholderTextColor="#A3B8E8"
              value={searchQuery}
              onChangeText={onSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onSearch('')}>
                <MaterialCommunityIcons name="close" size={20} color="#A3B8E8" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        <View style={styles.filterButtons}>
          {[
            { type: 'all', label: 'Todos', icon: 'format-list-bulleted' },
            { type: 'task', label: 'Tareas', icon: 'checkbox-blank-outline' },
            { type: 'reminder', label: 'Recordatorios', icon: 'clock-outline' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.type}
              style={[
                styles.filterButton,
                filterType === filter.type && styles.filterButtonActive
              ]}
              onPress={() => handleFilterChange(filter.type)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons 
                name={filter.icon} 
                size={16} 
                color={filterType === filter.type ? '#FFFFFF' : '#A3B8E8'} 
              />
              <Text style={[
                styles.filterButtonText,
                filterType === filter.type && styles.filterButtonTextActive
              ]}>
                {filter.label}
              </Text>
              {getFilterCount(filter.type) && (
                <View style={styles.filterCount}>
                  <Text style={styles.filterCountText}>{getFilterCount(filter.type)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  searchButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterButtonActive: {
    backgroundColor: '#1ADDDB',
    borderColor: 'rgba(26, 221, 219, 0.3)',
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default TaskHeader;
