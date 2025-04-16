import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  View, Text, StyleSheet, ImageBackground, TouchableOpacity, 
  FlatList, Image, Animated, StatusBar, ActivityIndicator, 
  Alert, RefreshControl, Dimensions, ScrollView, Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import ParticleBackground from '../components/ParticleBackground';
import TaskCard from '../components/TaskCard';
import HabitCard from '../components/HabitCard';
import AchievementCard from '../components/AchievementCard';
import motivationalQuotes from '../data/quotes';
import FloatingNavBar from '../components/FloatingNavBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import QuoteSection from '../components/QuoteSection';
import { usePoints } from '../components/Points';
import { API_URL } from '../config/api';
import DashboardScroll from '../components/DashboardScroll';
import PomodoroCard from '../components/PomodoroCard';
import NetInfo from '@react-native-community/netinfo';

const screenWidth = Dimensions.get('window').width;

// Constantes
const POINTS = {
  COMPLETE_TASK: 10,
  MAINTAIN_HABIT: 20,
  UNLOCK_ACHIEVEMENT: 50
};

const ACHIEVEMENTS = [
  { id: '1', title: 'Primer Paso', description: 'Completa tu primera tarea', points: 50, icon: '🏆', unlocked: false },
  { id: '2', title: 'Constancia', description: 'Mantén un hábito por 7 días', points: 100, icon: '🔄', unlocked: false },
  { id: '3', title: 'Productividad', description: 'Completa 10 tareas en una semana', points: 150, icon: '⚡', unlocked: false },
  { id: '4', title: 'Maestría', description: 'Alcanza el 100% en un hábito', points: 200, icon: '🌟', unlocked: false },
];

// Constante para caché
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos
const CACHE_KEYS = {
  TASKS: '@app_tasks_cache',
  HABITS: '@app_habits_cache',
  ACHIEVEMENTS: '@app_achievements_cache',
  TIMESTAMP: '@app_cache_timestamp'
};

// Componente para mostrar errores con opciones de recuperación
const ErrorMessage = ({ message, onRetry, onDismiss }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorText}>⚠️ {message}</Text>
    <View style={styles.errorButtonsContainer}>
      {onRetry && (
        <TouchableOpacity style={styles.errorButton} onPress={onRetry}>
          <Text style={styles.errorButtonText}>Reintentar</Text>
        </TouchableOpacity>
      )}
      {onDismiss && (
        <TouchableOpacity style={styles.errorButton} onPress={onDismiss}>
          <Text style={styles.errorButtonText}>Descartar</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const DashScreen = () => {
  const navigation = useNavigation();
  const { points, addPoints } = usePoints(0);
  
  const [state, setState] = useState({
    loading: true,
    error: null,
    refreshing: false,
    userData: null,
    tasks: [],
    habits: [],
    achievements: [],
    greeting: ''
  });

  // Función para cargar datos
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && state.refreshing) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        navigation.navigate('SignIn');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Función para manejar respuestas
      const fetchWithSafeResponse = async (url) => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const text = await response.text();
          return text ? JSON.parse(text) : [];
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
          return [];
        }
      };

      const [userData, tasks, habits, achievements] = await Promise.all([
        fetchWithSafeResponse(`${API_URL}/api/users/me`),
        fetchWithSafeResponse(`${API_URL}/api/tasks`),
        fetchWithSafeResponse(`${API_URL}/api/habits`),
        fetchWithSafeResponse(`${API_URL}/api/achievements`)
      ]);

      // Actualizar el saludo
      const currentHour = new Date().getHours();
      const greeting = currentHour < 12 ? 'Buenos días' :
                      currentHour < 18 ? 'Buenas tardes' :
                      'Buenas noches';

      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        userData: userData || {},
        tasks: Array.isArray(tasks) ? tasks : [],
        habits: Array.isArray(habits) ? habits : [],
        achievements: Array.isArray(achievements) ? achievements : [],
        greeting,
        error: null
      }));

    } catch (error) {
      console.error('Error en loadData:', error);
      setState(prev => ({
        ...prev,
        error: 'Error al cargar los datos',
        loading: false,
        refreshing: false
      }));
    }
  }, [navigation]);

  // Efecto para carga inicial
  useEffect(() => {
    if (state.loading) {
      loadData();
    }
  }, [loadData, state.loading]);

  // Componente de carga
  if (state.loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1ADDDB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        
        <View style={styles.headerFixed}>
          <Header 
            greeting={state.greeting}
            userName={state.userData?.username}
            userPoints={points}
            userAvatar={state.userData?.avatar}
          />
        </View>

        <DashboardScroll 
          refreshing={state.refreshing}
          onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setState(prev => ({ ...prev, refreshing: true }));
            loadData(true);
          }}
        >
          <QuoteSection />
          
          {state.error && (
            <ErrorMessage 
              message={state.error}
              onRetry={() => loadData(true)}
              onDismiss={() => setState(prev => ({ ...prev, error: null }))}
            />
          )}
          
          <TaskCard 
            tasks={state.tasks}
            onComplete={async (taskId) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await addPoints(POINTS.COMPLETE_TASK, 'complete_task');
              loadData(true);
            }}
          />
          
          <HabitCard 
            habits={state.habits}
            onUpdate={async (habitId) => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await addPoints(POINTS.MAINTAIN_HABIT, 'maintain_habit');
              loadData(true);
            }}
          />
          
          <PomodoroCard />

          <AchievementCard 
            achievements={state.achievements}
            onUnlock={async (achievementId) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await addPoints(POINTS.UNLOCK_ACHIEVEMENT, 'unlock_achievement');
              loadData(true);
            }}
          />
        </DashboardScroll>
        
        <FloatingNavBar activeTab="home" />
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#A3B8E8',
    fontSize: 18,
    marginTop: 10,
  },
  background: {
    flex: 1,
    width: '100%',
  },
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Aumentar el padding bottom para dar espacio a la barra flotante
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: StatusBar.currentHeight || 44,
    paddingHorizontal: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 99, 71, 0.2)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6347',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 10,
  },
  errorButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  errorButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 10,
  },
  sectionContainer: {
    backgroundColor: '#1D2B5F',
    marginBottom: 16,
    borderRadius: 15,
    padding: 8,
  },
  quoteContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#1ADDDB',
  },
  quoteText: {
    fontSize: 16,
    color: '#A3B8E8',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#A3B8E8',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  pointsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarContainer: {
    borderWidth: 2,
    borderColor: '#1ADDDB',
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D2B5F',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1D2B5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerFixed: {
    backgroundColor: '#030A24',
    paddingTop: StatusBar.currentHeight || 44,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(163, 184, 232, 0.1)',
    zIndex: 2,
  },
  offlineBanner: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineText: {
    color: '#FFC107',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default memo(DashScreen);