import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ImageBackground,
  RefreshControl
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import FloatingNavBar from '../components/FloatingNavBar';


const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    avatar: null,
    points: 0,
    level: 1,
    joinDate: null,
  });
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    habitsActive: 0,
    achievementsUnlocked: 0,
    currentStreak: 0,
    bestStreak: 0,
  });

  const loadUserData = useCallback(async () => {
    try {
      const [
        storedUserData,
        storedTasks,
        storedHabits,
        storedAchievements
      ] = await Promise.all([
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('tasks'),
        AsyncStorage.getItem('habits'),
        AsyncStorage.getItem('userAchievements')
      ]);

      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(prevData => ({
          ...prevData,
          ...parsedUserData
        }));
      }

      // Calcular estadísticas
      const tasks = storedTasks ? JSON.parse(storedTasks) : [];
      const habits = storedHabits ? JSON.parse(storedHabits) : [];
      const achievements = storedAchievements ? JSON.parse(storedAchievements) : [];

      setStats({
        tasksCompleted: tasks.filter(task => task.completed).length,
        habitsActive: habits.filter(habit => !habit.archived).length,
        achievementsUnlocked: achievements.filter(achievement => achievement.unlocked).length,
        currentStreak: calculateCurrentStreak(habits),
        bestStreak: calculateBestStreak(habits),
      });

    } catch (error) {
      console.error('Error al cargar datos del perfil:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);

  const calculateLevel = (points) => {
    return Math.floor(points / 100) + 1;
  };

  const calculateProgress = (points) => {
    return (points % 100) / 100;
  };

  const handleAvatarChange = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const newUserData = { ...userData, avatar: result.assets[0].uri };
        await AsyncStorage.setItem('userData', JSON.stringify(newUserData));
        setUserData(newUserData);
      }
    } catch (error) {
      console.error('Error al cambiar avatar:', error);
      Alert.alert('Error', 'No se pudo actualizar la imagen de perfil');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar sesión');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ADDDB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1ADDDB"
              colors={["#1ADDDB"]}
              progressBackgroundColor="rgba(29, 43, 95, 0.8)"
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Perfil Principal */}
          <View style={styles.profileSection}>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={handleAvatarChange}
            >
              {userData.avatar ? (
                <Image 
                  source={{ uri: userData.avatar }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <MaterialCommunityIcons name="account" size={40} color="#A3B8E8" />
                </View>
              )}
              <View style={styles.editAvatarButton}>
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.userName}>{userData.name}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
            
            {/* Nivel y Progreso */}
            <View style={styles.levelContainer}>
              <Text style={styles.levelText}>Nivel {calculateLevel(userData.points)}</Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar,
                    { width: `${calculateProgress(userData.points) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.pointsText}>{userData.points} puntos</Text>
            </View>
          </View>

          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#1ADDDB" />
                <Text style={styles.statValue}>{stats.tasksCompleted}</Text>
                <Text style={styles.statLabel}>Tareas Completadas</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFD700" />
                <Text style={styles.statValue}>{stats.habitsActive}</Text>
                <Text style={styles.statLabel}>Hábitos Activos</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="trophy" size={24} color="#FF6B6B" />
                <Text style={styles.statValue}>{stats.achievementsUnlocked}</Text>
                <Text style={styles.statLabel}>Logros Desbloqueados</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#FF9F1C" />
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Racha Actual</Text>
              </View>
            </View>
          </View>

          {/* Opciones */}
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <MaterialCommunityIcons name="account-edit" size={24} color="#1ADDDB" />
              <Text style={styles.optionText}>Editar Perfil</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#A3B8E8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialCommunityIcons name="bell" size={24} color="#1ADDDB" />
              <Text style={styles.optionText}>Notificaciones</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#A3B8E8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => navigation.navigate('Privacy')}
            >
              <MaterialCommunityIcons name="shield-lock" size={24} color="#1ADDDB" />
              <Text style={styles.optionText}>Privacidad</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#A3B8E8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => navigation.navigate('Help')}
            >
              <MaterialCommunityIcons name="help-circle" size={24} color="#1ADDDB" />
              <Text style={styles.optionText}>Ayuda</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#A3B8E8" />
            </TouchableOpacity>
          </View>

          {/* Botón de Cerrar Sesión */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
  },
  imageStyle: {
    opacity: 0.1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030A24',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1ADDDB',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#A3B8E8',
    marginBottom: 16,
  },
  levelContainer: {
    alignItems: 'center',
    width: '100%',
    marginTop: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1ADDDB',
    marginBottom: 8,
  },
  progressBarContainer: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#1ADDDB',
    borderRadius: 3,
  },
  pointsText: {
    fontSize: 14,
    color: '#A3B8E8',
  },
  statsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    width: '45%',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#A3B8E8',
    textAlign: 'center',
  },
  optionsContainer: {
    padding: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  optionText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});

export default ProfileScreen;