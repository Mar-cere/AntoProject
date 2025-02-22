import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Animated, Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const DashScreen = ({ navigation }) => {
  const [userName, setUserName] = useState('Usuario');
  const [tasks, setTasks] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const drawerAnimation = useState(new Animated.Value(width))[0];

  useEffect(() => {
    const fetchUserNameFromServer = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await fetch('https://anto-backend.onrender.com/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            setUserName(data.name || 'Usuario');
          }
        }
      } catch (error) {
        console.error('Error al cargar los datos del usuario:', error);
      }
    };
    fetchUserNameFromServer();
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch('https://anto-backend.onrender.com/api/tasks', {
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (!response.ok) throw new Error('Error al cargar las tareas');
        const data = await response.json();
        setTasks(data.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
      } catch (error) {
        console.error('Error al cargar las tareas:', error);
      }
    };
    fetchTasks();
  }, []);

  const toggleTaskCompletion = async (taskId) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const task = tasks.find(t => t._id === taskId);
      const response = await fetch(`https://anto-backend.onrender.com/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...task, completed: !task.completed }),
      });
      if (!response.ok) throw new Error('Error al actualizar la tarea');
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, completed: !t.completed } : t));
      Vibration.vibrate(50);
    } catch (error) {
      console.error('Error al actualizar tarea:', error);
    }
  };

  const toggleDrawer = () => {
    Animated.timing(drawerAnimation, {
      toValue: drawerVisible ? width : 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setDrawerVisible(!drawerVisible));
  };

  return (
    <View style={styles.container}>
      {/* Barra lateral */}
      {drawerVisible && (
        <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnimation }] }]}>          
          <TouchableOpacity onPress={() => { navigation.navigate('Profile'); toggleDrawer(); }} style={styles.drawerItem}>
            <Icon name="account-circle" size={24} color="#0E1A57" />
            <Text style={styles.drawerText}>Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { navigation.navigate('Settings'); toggleDrawer(); }} style={styles.drawerItem}>
            <Icon name="cog" size={24} color="#0E1A57" />
            <Text style={styles.drawerText}>Configuración</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleDrawer} style={styles.drawerItem}>
            <Icon name="menu" size={24} color="#0E1A57" />
            <Text style={styles.drawerText}>Cerrar</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      {/* Contenido Principal */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.greetingText}>Hola, {userName}</Text>
          <TouchableOpacity onPress={toggleDrawer} style={styles.drawerButton}>
            <Icon name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {/* Lista de Tareas */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tareas Pendientes</Text>
          {tasks.filter(task => !task.completed).slice(0, 3).map((task) => (
            <View key={task._id} style={styles.taskItem}>
              <TouchableOpacity style={styles.taskCheckbox} onPress={() => toggleTaskCompletion(task._id)}>
                <Icon name={task.completed ? "checkbox-marked" : "checkbox-blank-outline"} size={24} color="#5127DB" />
              </TouchableOpacity>
              <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E1A57' },
  scrollContainer: { paddingBottom: height / 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greetingText: { fontSize: 22, color: '#FFFFFF', fontWeight: 'bold' },
  drawerButton: { backgroundColor: '#5127DB', padding: 8, borderRadius: 8 },
  drawer: { position: 'absolute', right: 0, top: 0, width: width / 2, height: '100%', backgroundColor: '#CECFDB', padding: 20, zIndex: 10 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  drawerText: { fontSize: 18, color: '#0E1A57', marginLeft: 10 },
  card: { backgroundColor: '#CECFDB', borderRadius: 15, padding: 20, margin: 20 },
  cardTitle: { fontSize: 20, color: '#0E1A57', fontWeight: 'bold' },
  taskItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  taskCheckbox: { marginRight: 12 },
  taskTitle: { fontSize: 16, color: '#0E1A57' },
});

export default DashScreen;
