import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ImageBackground, TouchableOpacity, 
  FlatList, Image, Animated, StatusBar, ActivityIndicator, 
  Alert, RefreshControl, Dimensions, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, Text as SvgText, G, Line } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const screenWidth = Dimensions.get('window').width;

// Constantes
const POINTS = {
  COMPLETE_TASK: 10,
  MAINTAIN_HABIT: 20,
  UNLOCK_ACHIEVEMENT: 50
};

// Datos de ejemplo
const motivationalQuotes = [
  "El único modo de hacer un gran trabajo es amar lo que haces.",
  "No cuentes los días, haz que los días cuenten.",
  "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
  "La mejor forma de predecir el futuro es creándolo.",
  "Nunca es demasiado tarde para ser lo que podrías haber sido."
];

const ACHIEVEMENTS = [
  { id: '1', title: 'Primer Paso', description: 'Completa tu primera tarea', points: 50, icon: '🏆', unlocked: false },
  { id: '2', title: 'Constancia', description: 'Mantén un hábito por 7 días', points: 100, icon: '🔄', unlocked: false },
  { id: '3', title: 'Productividad', description: 'Completa 10 tareas en una semana', points: 150, icon: '⚡', unlocked: false },
  { id: '4', title: 'Maestría', description: 'Alcanza el 100% en un hábito', points: 200, icon: '🌟', unlocked: false },
];

// Componente de partículas para el fondo (reutilizado de HomeScreen)
const ParticleBackground = () => {
  // Crea 10 partículas con posiciones y animaciones aleatorias
  const particles = Array(10).fill(0).map((_, i) => {
    // Posiciones iniciales fijas (no animadas)
    const initialPosX = Math.random() * Dimensions.get('window').width;
    const initialPosY = Math.random() * Dimensions.get('window').height;
    
    // Solo animamos la opacidad con el controlador nativo
    const opacity = useRef(new Animated.Value(Math.random() * 0.5 + 0.1)).current;
    const size = Math.random() * 4 + 2; // Tamaño entre 2 y 6
    
    // Anima cada partícula (solo opacidad)
    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: Math.random() * 0.5 + 0.1,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: Math.random() * 0.3 + 0.05,
            duration: 2000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);
    
    return (
      <Animated.View
        key={i}
        style={{
          position: 'absolute',
          left: initialPosX,
          top: initialPosY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1ADDDB',
          opacity: opacity,
        }}
      />
    );
  });
  
  return <>{particles}</>;
};

// Componente de esqueleto para carga
const SkeletonLoader = ({ width, height, style }) => {
  const opacity = useState(new Animated.Value(0.3))[0];
  
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);
  
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#3D4B7C',
          borderRadius: 5,
          opacity,
        },
        style,
      ]}
    />
  );
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

// Componente de anillo de progreso
const ProgressRing = ({ radius, strokeWidth, progress, color }) => {
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const [animatedProgress] = useState(new Animated.Value(0));
  
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  const animatedStrokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  
  return (
    <Svg height={radius * 2} width={radius * 2} style={styles.svg}>
      <Circle
        stroke="#e6e6e6"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <AnimatedCircle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={animatedStrokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </Svg>
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
      const storedUserName = await AsyncStorage.getItem('userName');
      const storedUserAvatar = await AsyncStorage.getItem('userAvatar');
      const storedUserPoints = await AsyncStorage.getItem('userPoints');
      const storedAchievements = await AsyncStorage.getItem('userAchievements');
      const storedTasks = await AsyncStorage.getItem('tasks');
      const storedHabits = await AsyncStorage.getItem('habits');
      
      // Actualizar estados con los datos cargados
      if (storedUserName) setUserName(storedUserName);
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
        setGreeting('Buen día');
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
                {userAvatar ? (
                  <Image source={{ uri: userAvatar }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatar, { backgroundColor: '#1D2B5F' }]}>
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                      {userName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Cita motivacional */}
            <View style={styles.card}>
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
              
              <FlatList
                data={tasks.slice(0, 3)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.card,
                      styles.taskCard,
                      item.completed && styles.completedTask,
                    ]}
                    onPress={() => handleCompleteTask(item.id)}
                  >
                    <Text
                      style={[
                        styles.cardText,
                        item.completed && styles.completedTaskText,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                    {item.completed && (
                      <View style={styles.completedCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.card}>
                    <Text style={styles.cardText}>No hay tareas pendientes</Text>
                  </View>
                }
              />
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
                    <View style={styles.habitCardContentAbsolute}>
                      <View style={styles.progressRingContainer}>
                        <ProgressRing
                          radius={30}
                          strokeWidth={5}
                          progress={habit.progress}
                          color={habit.color}
                        />
                      </View>
                      
                      <View style={styles.habitTextContainerAbsolute}>
                        <Text style={styles.habitTitle}>{habit.title}</Text>
                        <Text style={styles.habitProgress}>
                          {Math.round(habit.progress * 100)}% completado
                        </Text>
                      </View>
                      
                      <TouchableOpacity
                        style={styles.updateButtonAbsolute}
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
                <AchievementItem
                  key={achievement.id}
                  achievement={achievement}
                  onPress={handleAchievementPress}
                />
              ))}
            </View>
          </Animated.View>
        </Animated.ScrollView>
        
        {/* Barra flotante */}
        <View style={styles.floatingBar}>
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => navigation.navigate('AddTask')}
          >
            <Text style={styles.floatingButtonText}>+ Tarea</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => navigation.navigate('AddHabit')}
          >
            <Text style={styles.floatingButtonText}>+ Hábito</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={() => navigation.navigate('Stats')}
          >
            <Text style={styles.floatingButtonText}>Estadísticas</Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 20,
    marginTop: 10,
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
    borderRadius: 25,
    marginRight: 10,
  },
  sectionContainer: {
    backgroundColor: '#1D2B5F',
    marginBottom: 20,
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
    marginBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 20,
    marginVertical: 10,
    alignItems: 'center',
    width: '90%',
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
  svg: {
    position: 'absolute',
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
    bottom: 20,
    width: '90%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1D2B5F',
    borderRadius: 20,
    paddingVertical: 10,
    alignSelf: 'center',
  },
  floatingButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  viewAllButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    marginTop: 10,
  },
  viewAllButtonText: {
    color: '#A3B8E8',
    fontSize: 14,
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
  habitCardContentAbsolute: {
    position: 'relative',
    width: '100%',
    height: 50, // Altura fija para la tarjeta
  },
  progressRingContainer: {
    position: 'absolute',
    left: 5,
  },
  habitTextContainerAbsolute: {
    position: 'absolute',
    left: 80, // Posición exacta desde la izquierda
    top: '50%',
    transform: [{ translateY: -20 }], // Ajustar según la altura del texto
    width: '60%', // Ancho controlado
  },
  updateButtonAbsolute: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -18 }], // Mitad del tamaño del botón
    backgroundColor: 'rgba(26, 221, 219, 0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#1ADDDB',
    fontSize: 20,
    fontWeight: 'bold',
  },
  habitTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
});

export default DashScreen;