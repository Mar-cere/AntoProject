import React, { useState, useEffect, useRef, useSafeAreaInsetsuseRef, useCallback, memo } from 'react';
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
import ProgressRing from '../components/ProgressRing';
import SkeletonLoader from '../components/SkeletonLoader';
import motivationalQuotes from '../data/quotes';
import FloatingNavBar from '../components/FloatingNavBar';
import Icon from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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

// Componente para mostrar logros y medallas
const AchievementItem = ({ achievement, onPress }) => (
  <TouchableOpacity 
    style={[styles.achievementItem, !achievement.unlocked && styles.achievementLocked]}
    onPress={() => onPress(achievement)}
  >
    <Text style={styles.achievementIcon}>{achievement.icon}</Text>
    <View style={styles.achievementTextContainer}>
      <Text style={styles.achievementTitle}>{achievement.title}</Text>
      <Text style={styles.achievementDescription}>{achievement.description}</Text>
    </View>
    {achievement.unlocked ? (
      <View style={styles.achievementPoints}>
        <Text style={styles.achievementPointsText}>+{achievement.points}</Text>
      </View>
    ) : (
      <View style={styles.achievementLock}>
        <Text style={styles.achievementLockText}>🔒</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Componente de efecto de brillo
const ShineEffect = () => {
  const translateX = useRef(new Animated.Value(-100)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: 250,
        duration: 2000,
        easing: Easing.ease,
        useNativeDriver: true,
      })
    ).start();
  }, []);
  
  return (
    <Animated.View
      style={[
        styles.shineEffect,
        {
          transform: [{ translateX }]
        }
      ]}
    />
  );
};

const Header = memo(({ greeting, userName, userPoints, userAvatar }) => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.userName}>{userName}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => navigation.navigate('Profile')}
      >
        {userAvatar ? (
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialCommunityIcons name="account" size={24} color="#A3B8E8" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const DashScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  
  // Estados
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('Usuario');
  const [userAvatar, setUserAvatar] = useState(null);
  const [quote, setQuote] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userAchievements, setUserAchievements] = useState(ACHIEVEMENTS);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ["Tareas completadas"]
  });
  const [habitStats, setHabitStats] = useState({
    labels: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    datasets: [
      {
        data: [0, 0, 0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ["Progreso de hábitos"]
  });

  // Añadir un indicador visual para el pull-to-refresh
  const scrollY = useRef(new Animated.Value(0)).current;
  const refreshIndicatorOpacity = scrollY.interpolate({
    inputRange: [-50, -20, 0],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp'
  });

  // Animación para el botón central
  const centerButtonScale = useRef(new Animated.Value(1)).current;
  const centerButtonRotate = useRef(new Animated.Value(0)).current;

  // Interpolación para la rotación
  const spin = centerButtonRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg']
  });

  // Estado para controlar si el menú está abierto
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigationDestination, setNavigationDestination] = useState(null);

  // Manejar la navegación en un efecto separado
  useEffect(() => {
    if (navigationDestination) {
      // Usar setTimeout para asegurar que la navegación ocurra después del renderizado
      const timer = setTimeout(() => {
        navigation.navigate(navigationDestination);
        setNavigationDestination(null);
      }, 0);
      
      return () => clearTimeout(timer);
    }
  }, [navigationDestination, navigation]);

  // Función optimizada para el botón central con useRef para el estado del menú
  const menuOpenRef = useRef(false);

  const handleCenterButton = (navigateTo) => {
    Animated.parallel([
    ]).start(() => {
      if (navigateTo) navigation.navigate(navigateTo);
    });
  };

  // Cargar datos
  const loadData = useCallback(async () => {
    try {
      if (!refreshing) {
        setLoading(true);
      }
      setError(null);
      
      // Cargar datos del usuario de forma más eficiente
      const [
        storedUserData,
        storedUserName,
        storedUserAvatar,
        storedUserPoints,
        storedAchievements,
        storedTasks,
        storedHabits
      ] = await Promise.all([
        AsyncStorage.getItem('userData'),
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userAvatar'),
        AsyncStorage.getItem('userPoints'),
        AsyncStorage.getItem('userAchievements'),
        AsyncStorage.getItem('tasks'),
        AsyncStorage.getItem('habits')
      ]);

      // Procesar datos del usuario
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        setUserData(userData);
        setUserName(userData.name || userData.username || 'Usuario');
      }

      // Establecer saludo personalizado según la hora
      const currentHour = new Date().getHours();
      const greeting = currentHour >= 6 && currentHour < 12 ? 'Buenos días' :
                      currentHour >= 12 && currentHour < 18 ? 'Buenas tardes' :
                      'Buenas noches';
      setGreeting(greeting);
      
      if (storedUserAvatar) setUserAvatar(storedUserAvatar);
      if (storedUserPoints) setUserPoints(parseInt(storedUserPoints));
      if (storedAchievements) setUserAchievements(JSON.parse(storedAchievements));
      if (storedTasks) setTasks(JSON.parse(storedTasks));
      if (storedHabits) setHabits(JSON.parse(storedHabits));
      
      // Si no hay datos guardados, usar datos de ejemplo
      if (!storedTasks) {
        setTasks([
          { id: '1', title: 'Terminar reporte', completed: false },
          { id: '2', title: 'Comprar víveres', completed: false },
          { id: '3', title: 'Hacer ejercicio', completed: false },
        ]);
      }
      
      if (!storedHabits) {
        setHabits([
          { id: '1', title: 'Leer 10 páginas', progress: 0.7, color: '#FF6384' },
          { id: '2', title: 'Beber 2L de agua', progress: 0.5, color: '#36A2EB' },
          { id: '3', title: 'Meditar 10 minutos', progress: 0.3, color: '#FFCE56' },
        ]);
      }
      
      // Generar datos aleatorios para las gráficas
      setWeeklyStats({
        ...weeklyStats,
        datasets: [{
          ...weeklyStats.datasets[0],
          data: Array(7).fill().map(() => Math.floor(Math.random() * 5))
        }]
      });
      
      setHabitStats({
        ...habitStats,
        datasets: [{
          ...habitStats.datasets[0],
          data: Array(7).fill().map(() => Math.random().toFixed(1))
        }]
      });
      
      // Establecer cita motivacional
      setQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
      
      // Animación de entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('No se pudieron cargar los datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);
  
  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();
  }, []);
  
  // Manejar pull-to-refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);
  
  // Manejar completar tarea
  const handleCompleteTask = useCallback((taskId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      );
      
      // Guardar en AsyncStorage
      AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
      
      return updatedTasks;
    });
    
    // Actualizar puntos si la tarea se completa
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      const newPoints = userPoints + POINTS.COMPLETE_TASK;
      setUserPoints(newPoints);
      AsyncStorage.setItem('userPoints', newPoints.toString());
      
      // Verificar logros
      checkAchievements(newPoints);
    }
  }, [tasks, userPoints]);
  
  // Verificar logros
  const checkAchievements = useCallback((points) => {
    const completedTasks = tasks.filter(task => task.completed).length;
    
    // Actualizar logros basados en el progreso
    const updatedAchievements = userAchievements.map(achievement => {
      if (achievement.unlocked) return achievement;
      
      let shouldUnlock = false;
      
      // Verificar condiciones para desbloquear logros
      if (achievement.id === '1' && completedTasks > 0) {
        shouldUnlock = true;
      } else if (achievement.id === '3' && completedTasks >= 10) {
        shouldUnlock = true;
      }
      
      if (shouldUnlock && !achievement.unlocked) {
        // Mostrar notificación
        Alert.alert(
          '¡Logro desbloqueado!',
          `Has desbloqueado: ${achievement.title}\n+${achievement.points} puntos`,
          [{ text: 'Genial', style: 'default' }]
        );
        
        // Actualizar puntos
        const newPoints = points + achievement.points;
        setUserPoints(newPoints);
        AsyncStorage.setItem('userPoints', newPoints.toString());
        
        return { ...achievement, unlocked: true };
      }
      
      return achievement;
    });
    
    setUserAchievements(updatedAchievements);
    AsyncStorage.setItem('userAchievements', JSON.stringify(updatedAchievements));
  }, [tasks, userAchievements]);
  
  // Manejar actualizar hábito
  const handleUpdateHabit = useCallback((habitId, newProgress) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setHabits(prevHabits => {
      const updatedHabits = prevHabits.map(habit => 
        habit.id === habitId ? { ...habit, progress: newProgress } : habit
      );
      
      // Guardar en AsyncStorage
      AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
      
      return updatedHabits;
    });
    
    // Actualizar puntos si el hábito alcanza el 100%
    const habit = habits.find(h => h.id === habitId);
    if (habit && habit.progress < 1 && newProgress >= 1) {
      const newPoints = userPoints + POINTS.MAINTAIN_HABIT;
      setUserPoints(newPoints);
      AsyncStorage.setItem('userPoints', newPoints.toString());
      
      // Verificar logros
      checkAchievements(newPoints);
    }
  }, [habits, userPoints]);
  
  // Manejar presionar logro
  const handleAchievementPress = useCallback((achievement) => {
    if (achievement.unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        achievement.title,
        `${achievement.description}\nPuntos: +${achievement.points}`,
        [{ text: 'Cerrar', style: 'default' }]
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Logro bloqueado',
        `${achievement.description}\nCompleta los requisitos para desbloquear este logro.`,
        [{ text: 'Entendido', style: 'default' }]
      );
    }
  }, []);
  
  // Animación para la barra flotante
  const floatingBarAnim = useRef(new Animated.Value(100)).current;
  const floatingBarOpacity = useRef(new Animated.Value(0)).current;
  const [activeTab, setActiveTab] = useState('home');
  
  useEffect(() => {
    // Animar la barra flotante después de que el contenido principal se haya cargado
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(floatingBarAnim, {
          toValue: 0,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(floatingBarOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    }, 800);
  }, []);

  // Renderizar pantalla de carga
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#030A24" />
        <ActivityIndicator size="large" color="#1ADDDB" />
        <Text style={styles.loadingText}>Cargando tu dashboard...</Text>
      </View>
    );
  }
  
  // Renderizar pantalla de error
  if (error && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" backgroundColor="#030A24" />
        <ErrorMessage 
          message={error}
          onRetry={loadData}
          onDismiss={() => setError(null)}
        />
      </View>
    );
  }
  
  const handleLogout = async () => {
    try {
      // Limpiar datos de autenticación
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('userName');
      await AsyncStorage.removeItem('userAvatar');
      
      // Navegar a la pantalla de inicio de sesión
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }], // Ajusta esto al nombre exacto de tu ruta
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      Alert.alert('Error', 'No se pudo cerrar sesión. Intenta de nuevo.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        
        <ScrollView 
          style={styles.contentContainer}
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
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* Encabezado */}
            <Header greeting={greeting} userName={userName} userPoints={userPoints} userAvatar={userAvatar} />
            
            {/* Cita motivacional */}
            <View style={styles.sectionContainer}>
              <Text style={styles.quoteText}>"{quote}"</Text>
            </View>
            
            {/* Sección de tareas */}
            <TaskCard />
            
            {/* Sección de hábitos */}
            <HabitCard />
            
            {/* Sección de logros */}
            <AchievementCard />
          </Animated.View>
        </ScrollView>
        
        <FloatingNavBar/>
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
    padding: 16,
    paddingBottom: 80, // Espacio para la barra flotante
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
  },
  loadingAnimation: {
    width: 200,
    height: 200,
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
  greetingText: {
    fontSize: 22,
    color: '#A3B8E8',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statsButtonIcon: {
    fontSize: 20,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginRight: 15,
  },
  pointsIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  pointsText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderRadius: 25,
    borderColor: '#1ADDDB',
    backgroundColor: '#1D2B5F',
    shadowColor: "#1ADDDB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  sectionContainer: {
    backgroundColor: '#1D2B5F',
    marginBottom: 16,
    borderRadius: 15,
    padding: 8,
  },
  sectionTitle: {
    padding:6,
    fontSize: 20,
    color: '#A3B8E8',
    marginBottom: 10,
  },
  quoteText: {
    fontSize: 18,
    color: '#A3B8E8',
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 28,
    marginVertical: 10,
    alignItems: 'center',
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ringsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 30,
    position: 'relative',
  },
  ringsSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendsSection: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 30,
  },
  textContainer: {
    flex: 1,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
  },
  moodItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  moodEmoji: {
    fontSize: 24,
  },
  completedTask: {
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
    borderColor: '#27AE60',
    borderWidth: 1,
  },
  completedTaskText: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  floatingBar: {
    position: 'absolute',
    bottom: 30,
    left: 8,
    right: 8,
    height: 50,
    backgroundColor: 'rgba(29, 43, 95, 0.9)',
    borderRadius: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  floatingBarButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  activeFloatingBarButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#1ADDDB',
  },
  activeFloatingChatButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#1ADDDB',
  },
  floatingBarIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBarIcon: {
    width: 24,
    height: 24,
    tintColor: '#A3B8E8',
    marginBottom:4,
  },
  floatingChatIcon: {
    width: 55,
    height: 55,
  },
  activeFloatingBarIcon: {
    tintColor: '#1ADDDB',
  },
  floatingBarText: {
    fontSize: 11,
    color: '#A3B8E8',
    textAlign: 'center',
  },
  activeFloatingBarText: {
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  floatingBarCenterButtonContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBarCenterButton: {
    width: 22,
    height: 22,
    borderRadius: 25,
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20, // Para que sobresalga de la barra
    borderWidth: 1,
    borderColor: '#1ADDDB',
    shadowColor: "#1ADDDB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
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
  chartContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  chartTitle: {
    color: '#A3B8E8',
    fontSize: 16,
    marginBottom: 10,
  },
  chart: {
    borderRadius: 10,
    paddingRight: 20,
  },
  habitLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  habitColor: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 10,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  habitProgress: {
    color: '#A3B8E8',
    fontSize: 14,
  },
  tasksGridContainer: {
    flexDirection: 'column',
    marginTop: 10,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
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
  pullToRefreshIndicator: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    paddingVertical: 10,
  },
  pullToRefreshText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rippleEffect: {
    position: 'absolute',
    width: 60,
    height: 60,
    top:-10,
    borderRadius: 30,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#1ADDDB',
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  addButton: {
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
  addButtonText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: '500',
  },
  loader: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 44,
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
});

export default DashScreen;