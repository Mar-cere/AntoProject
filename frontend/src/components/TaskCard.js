import React, { useState, useEffect, useCallback, memo } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_URL = 'https://antobackend.onrender.com';

// Componente de tarjeta de tareas
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
  
    const getPriorityColor = (priority) => {
      if (!priority) return '#FF6B6B'; // Color para recordatorios
      switch (priority) {
        case 'high': return '#FF6B6B';
        case 'medium': return '#FFD93D';
        case 'low': return '#6BCB77';
        default: return '#95A5A6';
      }
    };

    const getItemIcon = (itemType) => {
      return itemType === 'reminder' ? 'alarm-outline' : 'checkbox-outline';
    };

    const getItemColor = (itemType) => {
      return itemType === 'reminder' ? '#FF6B6B' : '#1ADDDB';
    };
  
    return (
      <View style={styles.taskCardContainer}>
        <View style={styles.taskCardHeader}>
          <View style={styles.taskTitleContainer}>
            <Ionicons name="list" size={24} color="#1ADDDB" />
            <Text style={styles.taskCardTitle}>Mis Pendientes</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('Tasks', { mode: 'list' })}
            activeOpacity={0.7}
          >
            <Text style={styles.viewAllText}>Ver todos</Text>
            <Ionicons name="chevron-forward" size={16} color="#1ADDDB" />
          </TouchableOpacity>
        </View>
  
        {loading ? (
          <ActivityIndicator color="#1ADDDB" style={styles.loader} />
        ) : items.length > 0 ? (
          <View style={styles.tasksContainer}>
            {items.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={[
                  styles.taskItem,
                  item.itemType === 'reminder' && styles.reminderItem
                ]}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.taskItemContent}>
                  <View style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(item.priority) }
                  ]} />
                  <Ionicons 
                    name={getItemIcon(item.itemType)}
                    size={20}
                    color={getItemColor(item.itemType)}
                    style={styles.itemIcon}
                  />
                  <View style={styles.taskItemMain}>
                    <Text style={styles.taskItemTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.dueDate && (
                      <Text style={[
                        styles.taskItemDueDate,
                        item.itemType === 'reminder' && styles.reminderDueDate
                      ]}>
                        {new Date(item.dueDate).toLocaleString()}
                      </Text>
                    )}
                  </View>
                  <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color="#A3B8E8" 
                    style={styles.taskItemArrow}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={40} color="#A3B8E8" />
            <Text style={styles.emptyText}>No hay items pendientes</Text>
            <TouchableOpacity 
              style={styles.addTaskButton}
              onPress={() => navigation.navigate('Tasks', { 
                mode: 'create',
                openModal: true 
              })}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#1ADDDB" />
              <Text style={styles.addTaskText}>Nuevo item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  });

  const styles = StyleSheet.create({
    taskCardContainer: {
        backgroundColor: 'rgba(29, 43, 95, 0.8)',
        borderRadius: 15,
        padding: 4,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(26, 221, 219, 0.1)',
      },
      taskCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
      },
      taskTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      taskCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFFFFF',
      },
      tasksContainer: {
        gap: 12,
      },
      viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(26, 221, 219, 0.1)',
      },
      viewAllText: {
        color: '#1ADDDB',
        fontSize: 14,
        fontWeight: '500',
      },
      loader: {
        padding: 24,
      },

  taskItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  taskItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
    gap: 4,
  },
  taskItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  taskDate: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  taskItemArrow: {
    marginLeft: 12,
  },
  taskProgress: {
    alignItems: 'flex-end',
    gap: 4,
  },
  taskItemDueDate: {
    fontSize: 12,
    color: '#A3B8E8',
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.2)',
    borderStyle: 'dashed',
  },
  addTaskText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    color: '#A3B8E8',
    fontSize: 16,
    textAlign: 'center',
  },
  reminderItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  itemIcon: {
    marginRight: 8,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 8,
  },
  taskItemMain: {
    flex: 1,
    gap: 4,
  },
  reminderDueDate: {
    color: '#FF6B6B',
  },
  });

  export default TaskCard;
  