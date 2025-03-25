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

const Header = memo(({ greeting, userName, userPoints, userAvatar }) => {
  const navigation = useNavigation();
  
  return (
    <View style={styles.headerContainer}>
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

  // Animación para el botón central
  const centerButtonRotate = useRef(new Animated.Value(0)).current;

  // Estado para controlar si el menú está abierto
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
  
  // Animación para la barra flotante
  const floatingBarAnim = useRef(new Animated.Value(100)).current;
  const floatingBarOpacity = useRef(new Animated.Value(0)).current;
  
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
            <Header greeting={greeting} userName={userName} userPoints={userPoints} userAvatar={userAvatar} />
            
            <View style={styles.sectionContainer}>
              <Text style={styles.quoteText}>"{quote}"</Text>
            </View>
            
            <TaskCard />
            <HabitCard />
            <AchievementCard />
          </Animated.View>
        </ScrollView>
        
        <FloatingNavBar 
          activeTab="Dash"
          onTabPress={(screen) => {
            navigation.navigate(screen);
          }}
          animValues={{
            translateY: floatingBarAnim,
            opacity: floatingBarOpacity
          }}
        />
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
  quoteText: {
    fontSize: 18,
    color: '#A3B8E8',
    textAlign: 'center',
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