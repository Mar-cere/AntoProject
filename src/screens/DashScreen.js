import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, FlatList, StyleSheet, StatusBar, ImageBackground, 
  TouchableOpacity, Animated, Image, RefreshControl, ActivityIndicator, Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import Svg, { Circle, Text as SvgText, G, Line, Rect } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { LineChart } from 'react-native-chart-kit';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Sistema de puntos y logros
const POINTS = {
  COMPLETE_TASK: 10,
  MAINTAIN_HABIT: 15,
  STREAK_BONUS: 5, // puntos extra por día consecutivo
};

const ACHIEVEMENTS = [
  { id: 'a1', title: 'Primer Paso', description: 'Completa tu primera tarea', points: 50, icon: '🏆', unlocked: false },
  { id: 'a2', title: 'Constancia', description: 'Mantén un hábito por 7 días', points: 100, icon: '🔥', unlocked: false },
  { id: 'a3', title: 'Maestro Organizador', description: 'Completa 50 tareas', points: 200, icon: '⭐', unlocked: false },
  { id: 'a4', title: 'Hábito Saludable', description: 'Mantén un hábito de salud por 30 días', points: 300, icon: '💪', unlocked: false },
  { id: 'a5', title: 'Productividad Total', description: 'Completa todas las tareas del día 5 veces', points: 250, icon: '🚀', unlocked: false },
];

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

// Componente para gráficos semanales
const WeeklyStatsChart = ({ data, title }) => {
  const chartConfig = {
    backgroundGradientFrom: '#1D2B5F',
    backgroundGradientTo: '#1D2B5F',
    color: (opacity = 1) => `rgba(163, 184, 232, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };
  
  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={data}
        width={Dimensions.get('window').width - 40}
        height={180}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

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
      <Circle
        stroke={color}
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </Svg>
  );
};

const screenWidth = Dimensions.get('window').width;

const sampleHabits = [
  { id: '1', title: 'Leer 10 páginas', progress: 0.7, color: '#FF6384' },
  { id: '2', title: 'Beber 2L de agua', progress: 0.5, color: '#36A2EB' },
];

const sampleTasks = [
  { id: '1', title: 'Terminar reporte', completed: false },
  { id: '2', title: 'Comprar víveres', completed: false },
  { id: '3', title: 'Hacer ejercicio', completed: false },
];

const motivationalQuotes = [
  "Hoy es un buen día para intentarlo.",
  "Pequeños pasos te llevan lejos.",
  "Tu esfuerzo no pasa desapercibido.",
  "Cada día es una nueva oportunidad.",
];

const baseRadius = 20;
const strokeWidth = 14;

const DashScreen = () => {
  const navigation = useNavigation();
  const [fadeAnim] = useState(new Animated.Value(0));
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
        ]);
      }
      
      
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
      
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No pudimos cargar tus datos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  function handleRefresh() {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }

  function navigateToStatistics() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Statistics');
  }

  function showAchievementDetails(achievement) {
    Alert.alert(
      achievement.title,
      `${achievement.description}\n\nRecompensa: ${achievement.points} puntos`,
      [{ text: 'Cerrar', style: 'default' }]
    );
  }

  function toggleTaskCompletion(id) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.map(task => {
        if (task.id === id) {
          const completed = !task.completed;
          
          // Otorgar puntos si se completa
          if (completed) {
            setUserPoints(prev => {
              const newPoints = prev + POINTS.COMPLETE_TASK;
              AsyncStorage.setItem('userPoints', newPoints.toString());
              return newPoints;
            });
          }
          
          return { ...task, completed };
        }
        return task;
      });
      
      // Guardar tareas actualizadas
      AsyncStorage.setItem('tasks', JSON.stringify(updatedTasks));
      return updatedTasks;
    });
  }

  function updateHabitProgress(id, newProgress) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setHabits(prevHabits => {
      const updatedHabits = prevHabits.map(habit => {
        if (habit.id === id) {
          // Otorgar puntos si se alcanza cierto progreso
          if (newProgress >= 0.9 && habit.progress < 0.9) {
            setUserPoints(prev => {
              const newPoints = prev + POINTS.MAINTAIN_HABIT;
              AsyncStorage.setItem('userPoints', newPoints.toString());
              return newPoints;
            });
          }
          
          return { ...habit, progress: newProgress };
        }
        return habit;
      });
      
      // Guardar hábitos actualizados
      AsyncStorage.setItem('habits', JSON.stringify(updatedHabits));
      return updatedHabits;
    });
  }

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    loadData();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#A3B8E8" style={{marginBottom: 20}} />
        <Text style={styles.loadingText}>Cargando tus datos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <View style={styles.contentContainer}>
          {error && (
            <ErrorMessage 
              message={error}
              onRetry={loadData}
              onDismiss={() => setError(null)}
            />
          )}
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                style={styles.statsButton}
                onPress={navigateToStatistics}
              >
                <Text style={styles.statsButtonIcon}>📊</Text>
              </TouchableOpacity>
              
              <View style={styles.pointsContainer}>
                <Text style={styles.pointsIcon}>⭐</Text>
                <Text style={styles.pointsText}>{userPoints}</Text>
              </View>
              
              <Image 
                source={userAvatar ? { uri: userAvatar } : require('../images/avatar.png')} 
                style={styles.userAvatar} 
              />
            </View>
          </View>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}> 
            <Text style={styles.sectionTitle}>¿Cómo te sientes hoy?</Text>
            <View style={styles.moodContainer}>
              {['😊', '😐', '😔', '😤', '😴'].map((emoji, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.moodItem}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    // Lógica para guardar estado de ánimo
                  }}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}> 
            <Text style={styles.sectionTitle}>Tareas</Text>
            <FlatList
              data={tasks}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => toggleTaskCompletion(item.id)}>
                  <View style={[styles.card, styles.taskCard, item.completed && styles.completedTask]}>
                    {item.completed && (
                      <View style={styles.completedCheckmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                    <Text style={[styles.cardText, item.completed && styles.completedTaskText]}>
                      {item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </Animated.View>

          <Text style={styles.quoteText}>{quote}</Text>



          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Hábitos</Text>
            <View style={styles.card}>
              <View style={styles.ringsSection}>
                <View style={styles.ringsContainer}>
                  {sampleHabits.map((habit, index) => (
                    <ProgressRing
                      key={habit.id}
                      radius={baseRadius + index * (strokeWidth + 5)}
                      strokeWidth={strokeWidth}
                      progress={habit.progress}
                      color={habit.color}
                    />
                  ))}
                </View>
              </View>
              <View style={styles.legendsSection}>
                {habits.map(habit => (
                  <TouchableOpacity 
                    key={habit.id} 
                    onPress={() => {
                      // Simular actualización de progreso al tocar
                      const newProgress = Math.min(1, habit.progress + 0.1);
                      updateHabitProgress(habit.id, newProgress);
                    }}
                  >
                    <View style={styles.habitLegend}>
                      <View style={[styles.habitColor, { backgroundColor: habit.color }]} />
                      <Text style={styles.cardText}>{habit.title}</Text>
                      <Text style={styles.habitProgress}>{Math.round(habit.progress * 100)}%</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Animated.View style={[styles.sectionContainer, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Logros</Text>
            <FlatList
              data={userAchievements.filter(a => a.unlocked).length > 0 
                ? userAchievements.filter(a => a.unlocked) 
                : userAchievements.slice(0, 2)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <AchievementItem 
                  achievement={item} 
                  onPress={showAchievementDetails}
                />
              )}
            />
            {userAchievements.filter(a => a.unlocked).length > 0 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('Achievements')}
              >
                <Text style={styles.viewAllButtonText}>Ver todos los logros</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Barra Flotante */}
          <View style={styles.floatingBar}>
            <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Journal')}> 
              <Text style={styles.floatingButtonText}>📖 Journal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Chat')}> 
              <Text style={styles.floatingButtonText}>💬 Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate('Settings')}> 
              <Text style={styles.floatingButtonText}>⚙️ Configuración</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    marginTop:20,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingAnimation: {
    width: 200,
    height: 200,
  },
  loadingText: {
    color: '#A3B8E8',
    fontSize: 18,
    marginTop: 20,
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
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
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
});

export default DashScreen;