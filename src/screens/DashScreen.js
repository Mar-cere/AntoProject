import React, { useState, useEffect, useRef, useSafeAreaInsetsuseRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ImageBackground, TouchableOpacity, 
  FlatList, Image, Animated, StatusBar, ActivityIndicator, 
  Alert, RefreshControl, Dimensions, ScrollView, Easing
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import ParticleBackground from '../components/ParticleBackground';
import ProgressRing from '../components/ProgressRing';
import SkeletonLoader from '../components/SkeletonLoader';
import motivationalQuotes from '../data/quotes';
import FloatingNavBar from '../components/FloatingNavBar';
import { Ionicons } from '@expo/vector-icons';

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
      
      // Simular carga de datos
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Cargar datos desde AsyncStorage
      const storedUserData = await AsyncStorage.getItem('userData');
      const storedUserName = await AsyncStorage.getItem('userName');
      const storedUserAvatar = await AsyncStorage.getItem('userAvatar');
      const storedUserPoints = await AsyncStorage.getItem('userPoints');
      const storedAchievements = await AsyncStorage.getItem('userAchievements');
      const storedTasks = await AsyncStorage.getItem('tasks');
      const storedHabits = await AsyncStorage.getItem('habits');
      
      // Actualizar estados con los datos cargados
      if (storedUserData) {
        try {
          const userData = JSON.parse(storedUserData);
          setUserData(userData);
          // Usar el nombre del usuario de userData si está disponible
          if (userData.name) {
            setUserName(userData.name);
          } else if (userData.username) {
            setUserName(userData.username);
          }
        } catch (e) {
          console.error('Error al parsear userData:', e);
        }
      } else if (storedUserName) {
        setUserName(storedUserName);
      }
      
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
      
      // Establecer saludo según hora del día
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 12) {
        setGreeting('Buenos días');
      } else if (currentHour >= 12 && currentHour < 18) {
        setGreeting('Buenas tardes');
      } else {
        setGreeting('Buenas noches');
      }
      
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
      
    } catch (err) {
      console.error('Error al cargar datos:', err);
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
        
        <Animated.ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#1ADDDB"
              colors={["#1ADDDB"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }],
            }}
          >
            {/* Encabezado */}
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <Text style={styles.greetingText}>{greeting}</Text>
                <Text style={styles.nameText}>{userName}</Text>
              </View>
              <View style={styles.headerRight}>
                <View style={styles.pointsContainer}>
                  <Text style={styles.pointsIcon}>⭐</Text>
                  <Text style={styles.pointsText}>{userPoints}</Text>
                </View>
                  <Image source={require('../images/avatar.png')} style={styles.userAvatar} />
              </View>
            </View>
            
            {/* Cita motivacional */}
            <View style={styles.sectionContainer}>
              <Text style={styles.quoteText}>"{quote}"</Text>
            </View>
            
            {/* Sección de tareas */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mis Tareas</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
                  <Text style={styles.seeAllText}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              
              {tasks.length > 0 ? (
                <View style={styles.tasksGridContainer}>
                  {tasks
                    .sort((a, b) => (a.priority || 3) - (b.priority || 3))
                    .slice(0, 3)
                    .map((task) => (
                      <TouchableOpacity
                        key={task.id}
                        style={[
                          styles.taskCard,
                          task.completed && styles.completedTaskCard
                        ]}
                        onPress={() => handleCompleteTask(task.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.priorityIndicator, 
                          { backgroundColor: 
                            task.priority === 1 ? '#FF5252' : 
                            task.priority === 2 ? '#FFC107' : '#8BC34A' 
                          }
                        ]} />
                        
                        <Text style={styles.taskTitle} numberOfLines={2}>
                          {task.title}
                        </Text>
                        
                        {task.dueDate && (
                          <Text style={styles.taskDueDate}>
                            {new Date(task.dueDate).toLocaleDateString()}
                          </Text>
                        )}
                        
                        <View style={styles.taskFooter}>
                          {task.completed ? (
                            <View style={styles.statusBadge}>
                              <Text style={styles.statusBadgeText}>
                                Completada • Prioridad {task.priority || 3}
                              </Text>
                            </View>
                          ) : (
                            <View style={[
                              styles.statusBadge,
                              { backgroundColor: 
                                task.priority === 1 ? 'rgba(255, 82, 82, 0.7)' : 
                                task.priority === 2 ? 'rgba(255, 193, 7, 0.7)' : 
                                'rgba(26, 221, 219, 0.7)' 
                              }
                            ]}>
                              <Text style={styles.statusBadgeText}>
                                Pendiente • Prioridad {task.priority || 3}
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  
                  {tasks.length > 3 && (
                    <TouchableOpacity 
                      style={styles.viewAllButton}
                      onPress={() => navigation.navigate('Tasks')}
                    >
                      <Text style={styles.viewAllButtonText}>
                        +{tasks.length - 3} más
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.emptyTasksContainer}>
                  <Text style={styles.emptyTasksText}>No hay tareas pendientes</Text>
                  <TouchableOpacity 
                    style={styles.addTaskButton}
                    onPress={() => navigation.navigate('AddTask')}
                  >
                    <Text style={styles.addTaskButtonText}>+ Añadir tarea</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            
            {/* Sección de hábitos */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Mis Hábitos</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Habits')}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
              </View>
              
              {habits.length > 0 ? (
                habits.map((habit) => (
                  <View key={habit.id} style={styles.card}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ProgressRing
                        radius={25}
                        strokeWidth={5}
                        progress={habit.progress}
                        color={habit.color}
                      />
                      <View style={{ marginLeft: 75, flex: 1 }}>
                        <Text style={styles.cardText}>{habit.title}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.updateButton}
                        onPress={() => {
                          const newProgress = Math.min(habit.progress + 0.1, 1);
                          handleUpdateHabit(habit.id, newProgress);
                        }}
                      >
                        <Text style={styles.updateButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.card}>
                  <Text style={styles.cardText}>No hay hábitos configurados</Text>
                </View>
              )}
            </View>
            
            {/* Sección de logros */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Logros</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
                  <Text style={styles.seeAllText}>Ver todos</Text>
                </TouchableOpacity>
              </View>
              
              {userAchievements.slice(0, 2).map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  style={[
                    styles.achievementCard,
                    achievement.unlocked && styles.unlockedAchievementCard
                  ]}
                  onPress={() => handleAchievementPress(achievement)}
                  activeOpacity={0.8}
                >
                  <View style={styles.achievementIconContainer}>
                    {achievement.unlocked ? (
                      <Image
                        source={achievement.icon || require('../images/medal.png')}
                        style={styles.achievementIcon}
                      />
                    ) : (
                      <View style={styles.lockedIconContainer}>
                        <Image
                          source={require('../images/lock.png')}
                          style={styles.lockedIcon}
                        />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.achievementContent}>
                    <Text style={styles.achievementTitle} numberOfLines={1}>
                      {achievement.title}
                    </Text>
                    
                    <Text style={styles.achievementDescription} numberOfLines={2}>
                      {achievement.unlocked 
                        ? achievement.description 
                        : '¡Completa este desafío para desbloquear!'}
                    </Text>
                    
                    {achievement.progress !== undefined && (
                      <View style={styles.achievementProgressContainer}>
                        <View style={styles.achievementProgressBar}>
                          <View 
                            style={[
                              styles.achievementProgressFill,
                              { width: `${Math.min(100, achievement.progress)}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.achievementProgressText}>
                          {achievement.progress}%
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {achievement.unlocked && achievement.date && (
                    <View style={styles.achievementDateContainer}>
                      <Text style={styles.achievementDateText}>
                        {new Date(achievement.date).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  
                  {achievement.unlocked && achievement.reward && (
                    <View style={styles.achievementRewardBadge}>
                      <Text style={styles.achievementRewardText}>
                        +{achievement.reward}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Animated.ScrollView>
        
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
    marginTop: 44,
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
    borderWidth: 1.4,
    borderRadius: 25,
    borderColor: '#1ADDDB',
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
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderColor: 'rgba(26, 221, 219, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  viewAllButtonText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: 'bold',
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
  taskCard: {
    width: '100%',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  completedTaskCard: {
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
    borderColor: '#27AE60',
    borderWidth: 1,
  },
  priorityIndicator: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  taskTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    paddingRight: 20,
  },
  taskDueDate: {
    color: '#A3B8E8',
    fontSize: 12,
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: 'rgba(39, 174, 96, 0.7)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyTasksContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTasksText: {
    color: '#A3B8E8',
    fontSize: 16,
    marginBottom: 10,
  },
  addTaskButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  addTaskButtonText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: 'bold',
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
  achievementCard: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(163, 184, 232, 0.3)',
  },
  unlockedAchievementCard: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderColor: 'rgba(26, 221, 219, 0.5)',
  },
  achievementIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  achievementIcon: {
    width: 30,
    height: 30,
    tintColor: '#1ADDDB',
  },
  lockedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(163, 184, 232, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  lockedIcon: {
    width: 20,
    height: 20,
    tintColor: '#A3B8E8',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementDescription: {
    color: '#A3B8E8',
    fontSize: 12,
    marginBottom: 8,
  },
  achievementProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(163, 184, 232, 0.2)',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  achievementProgressFill: {
    height: '100%',
    backgroundColor: '#1ADDDB',
    borderRadius: 3,
  },
  achievementProgressText: {
    color: '#1ADDDB',
    fontSize: 12,
    fontWeight: 'bold',
    width: 35,
    textAlign: 'right',
  },
  achievementDateContainer: {
    position: 'absolute',
    bottom: 10,
    right: 15,
  },
  achievementDateText: {
    color: '#A3B8E8',
    fontSize: 10,
  },
  achievementRewardBadge: {
    position: 'absolute',
    top: 10,
    right: 15,
    backgroundColor: 'rgba(39, 174, 96, 0.7)',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  achievementRewardText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyAchievementsContainer: {
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAchievementsIcon: {
    width: 40,
    height: 40,
    tintColor: '#A3B8E8',
    marginBottom: 10,
    opacity: 0.7,
  },
  emptyAchievementsText: {
    color: '#A3B8E8',
    fontSize: 14,
    textAlign: 'center',
  },
  viewAllAchievementsButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderColor: 'rgba(26, 221, 219, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },
  viewAllAchievementsText: {
    color: '#1ADDDB',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default DashScreen;