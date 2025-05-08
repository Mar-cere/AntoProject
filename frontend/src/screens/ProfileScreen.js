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
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROUTES } from '../constants/routes';
import { API_URL } from '../config/api';


const ProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState({
    username: '',
    email: '',
    avatar: null,
    lastLogin: null,
    preferences: {
      theme: 'light',
      notifications: true
    },
    stats: {
      tasksCompleted: 0,
      habitsStreak: 0,
      lastActive: null
    },
  });
  const [stats, setStats] = useState({
    tasksCompleted: 0,
    habitsActive: 0,
    currentStreak: 0,
    bestStreak: 0,
  });
  const [detailedStats, setDetailedStats] = useState({
    totalTasks: 0,
    tasksCompleted: 0,
    tasksThisWeek: 0,
    habitsActive: 0,
    habitsCompleted: 0,
    totalHabits: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastActive: null
  });
  const [avatarUrl, setAvatarUrl] = useState(null);

  const loadUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const storedUserData = await AsyncStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        setUserData(prevData => ({
          ...prevData,
          ...parsedUserData,
          stats: {
            ...parsedUserData.stats,
            lastActive: new Date()
          }
        }));

        // Calculamos estadísticas detalladas
        setDetailedStats({
          ...detailedStats,
          currentStreak: parsedUserData.stats?.habitsStreak ?? 0,
          lastActive: parsedUserData.stats?.lastActive ?? null
        });

        if (parsedUserData.avatar) {
          const url = await fetchAvatarUrl(parsedUserData.avatar, token);
          setAvatarUrl(url);
        } else {
          setAvatarUrl(null);
        }

        console.log('userData.avatar:', parsedUserData.avatar);
        console.log('avatarUrl:', avatarUrl);
      }
    } catch (error) {
      console.error('Error al cargar datos del perfil:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchAvatarUrl = async (publicId, token) => {
    if (!publicId) return null;
    try {
      const res = await fetch(`${API_URL}/api/users/avatar-url/${publicId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      return data.url;
    } catch (e) {
      console.log('Error obteniendo avatar:', e);
      return null;
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, []);

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
              setLoading(true);
              
              // Limpiar solo los datos relevantes de la sesión
              const keysToRemove = [
                'userToken',
                'userData',
                'userPreferences'
              ];
              
              await Promise.all(
                keysToRemove.map(key => AsyncStorage.removeItem(key))
              );

              // Reiniciar el estado local
              setUserData({
                username: '',
                email: '',
                avatar: null,
                lastLogin: null,
                preferences: {
                  theme: 'light',
                  notifications: true
                },
                stats: {
                  tasksCompleted: 0,
                  habitsStreak: 0,
                  lastActive: null
                },
              });

              // Navegar a la pantalla de inicio de sesión usando la constante de ruta
              navigation.reset({
                index: 0,
                routes: [{ name: ROUTES.SIGN_IN }],
              });
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert(
                'Error',
                'No se pudo cerrar sesión. Por favor, intenta nuevamente.'
              );
            } finally {
              setLoading(false);
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
    <SafeAreaView style={styles.container}>
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
          {/* Header Mejorado */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mi Perfil</Text>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialCommunityIcons name="cog" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Perfil Principal */}
          <View style={styles.profileSection}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image 
                  source={{ uri: avatarUrl }} 
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <MaterialCommunityIcons name="account" size={40} color="#A3B8E8" />
                </View>
              )}
            </View>
            <Text style={styles.userName}>{userData.username}</Text>
            <Text style={styles.userEmail}>{userData.email}</Text>
          </View>

          {/* Estadísticas actualizadas */}
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Estadísticas</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsGrid}
            >
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#1ADDDB" />
                <Text style={styles.statValue}>{userData.stats.tasksCompleted}</Text>
                <Text style={styles.statLabel}>Tareas Completadas</Text>
                <Text style={styles.statSubLabel}>
                  {detailedStats.tasksThisWeek} esta semana
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFD700" />
                <Text style={styles.statValue}>{detailedStats.habitsActive}</Text>
                <Text style={styles.statLabel}>Hábitos Activos</Text>
                <Text style={styles.statSubLabel}>
                  {detailedStats.habitsCompleted} completados hoy
                </Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="fire" size={24} color="#FF9F1C" />
                <Text style={styles.statValue}>{userData.stats.habitsStreak}</Text>
                <Text style={styles.statLabel}>Racha Actual</Text>
                <Text style={styles.statSubLabel}>
                  Mejor: {detailedStats.bestStreak} días
                </Text>
              </View>
            </ScrollView>
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
    </SafeAreaView>
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
    paddingVertical: 12,
    backgroundColor: 'rgba(3, 10, 36, 0.8)', // Fondo semi-transparente
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
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
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  statItem: {
    width: 160,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
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
  totalPointsText: {
    fontSize: 12,
    color: '#A3B8E8',
    marginTop: 4,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#A3B8E8',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default ProfileScreen;