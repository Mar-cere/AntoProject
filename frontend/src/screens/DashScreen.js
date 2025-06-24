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
import FloatingNavBar from '../components/FloatingNavBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import QuoteSection from '../components/QuoteSection';
import { API_URL } from '../config/api';
import DashboardScroll from '../components/DashboardScroll';
import PomodoroCard from '../components/PomodoroCard';
import { getGreetingByHourAndDayAndName } from '../utils/greetings';
// import { copilot, walkthroughable, CopilotStep } from 'react-native-copilot';

const screenWidth = Dimensions.get('window').width;

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

// const WalkthroughableView = walkthroughable(View);

const DashScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [refreshAnim] = useState(new Animated.Value(0));
  // const [showingTutorial, setShowingTutorial] = useState(false);

  // Mostrar tutorial solo la primera vez
  // useEffect(() => {
  //   const checkTutorial = async () => {
  //     const seen = await AsyncStorage.getItem('hasSeenTutorial');
  //     if (!seen) {
  //       setTimeout(() => {
  //         props.start();
  //         setShowingTutorial(true);
  //       }, 800); // Espera a que cargue la UI
  //     }
  //   };
  //   if (!loading) checkTutorial();
  // }, [loading]);

  // Cuando termine el tutorial, guardar la bandera
  // useEffect(() => {
  //   if (!props.copilotEvents) return;
  //   const handleStop = () => {
  //     AsyncStorage.setItem('hasSeenTutorial', 'true');
  //     setShowingTutorial(false);
  //   };
  //   props.copilotEvents.on('stop', handleStop);
  //   return () => {
  //     props.copilotEvents.off('stop', handleStop);
  //   };
  // }, [props.copilotEvents]);

  // Función para cargar datos
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && refreshing) return;
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
      const fetchWithSafeResponse = async (url, label) => {
        try {
          const response = await fetch(url, { headers });
          if (!response.ok) {
            throw new Error(`Error ${label}: status ${response.status}`);
          }
          const text = await response.text();
          return text ? JSON.parse(text) : [];
        } catch (error) {
          console.error(`Error fetching ${url}:`, error);
          setError(`No se pudo cargar ${label}. Intenta de nuevo.`);
          return [];
        }
      };
      const [userData, tasks, habits] = await Promise.all([
        fetchWithSafeResponse(`${API_URL}/api/users/me`, 'usuario'),
        fetchWithSafeResponse(`${API_URL}/api/tasks`, 'tareas'),
        fetchWithSafeResponse(`${API_URL}/api/habits`, 'hábitos'),
      ]);
      let avatarUrl = null;
      if (userData?.avatar) {
        avatarUrl = await fetchAvatarUrl(userData.avatar, token);
      }
      setAvatarUrl(avatarUrl);
      setUserData(userData || {});
      setTasks(Array.isArray(tasks) ? tasks : []);
      setHabits(Array.isArray(habits) ? habits : []);
      const now = new Date();
      setGreeting(getGreetingByHourAndDayAndName({
        hour: now.getHours(),
        dayIndex: now.getDay(),
        userName: userData?.username || ""
      }));
      setLoading(false);
      setRefreshing(false);
      setError(null);
    } catch (error) {
      console.error('Error en loadData:', error);
      setError('Error al cargar los datos');
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, refreshing]);

  // Efecto para carga inicial
  useEffect(() => {
    if (loading) {
      loadData();
    }
  }, [loadData, loading]);

  // Animación al refrescar
  const triggerRefreshAnim = () => {
    Animated.sequence([
      Animated.timing(refreshAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(refreshAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      })
    ]).start();
  };

  // Componente de carga
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1ADDDB" />
        <Text style={styles.loadingText}>Cargando tu panel...</Text>
      </View>
    );
  }

  // Avatar por defecto
  const avatarToShow = avatarUrl || require('../images/avatar.png');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        {/* <CopilotStep text="¡Bienvenido! Aquí verás tu saludo y avatar." order={1} name="header"> */}
        {/* <WalkthroughableView style={styles.headerFixed}> */}
        <View style={styles.headerFixed}>
          <Header 
            greeting={greeting}
            userAvatar={avatarToShow}
          />
        </View>
        {/* </WalkthroughableView> */}
        {/* </CopilotStep> */}
        <DashboardScroll 
          refreshing={refreshing}
          onRefresh={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setRefreshing(true);
            triggerRefreshAnim();
            loadData(true);
          }}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* <CopilotStep text="Aquí encontrarás una frase motivacional diaria." order={2} name="quote"> */}
          {/* <WalkthroughableView> */}
          <QuoteSection />
          {/* </WalkthroughableView> */}
          {/* </CopilotStep> */}
          {error && (
            <ErrorMessage 
              message={error}
              onRetry={() => loadData(true)}
              onDismiss={() => setError(null)}
            />
          )}
          {/* <CopilotStep text="Gestiona tus tareas diarias aquí." order={3} name="tasks"> */}
          {/* <WalkthroughableView> */}
          <Animated.View style={{
            transform: [{ scale: refreshAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
            opacity: refreshAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] })
          }}>
            <TaskCard 
              tasks={tasks}
              onComplete={async (taskId) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                loadData(true);
              }}
              accessibilityLabel="Lista de tareas"
            />
          </Animated.View>
          {/* </WalkthroughableView> */}
          {/* </CopilotStep> */}
          {/* <CopilotStep text="Aquí puedes seguir tus hábitos y rachas." order={4} name="habits"> */}
          {/* <WalkthroughableView> */}
          <Animated.View style={{
            transform: [{ scale: refreshAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
            opacity: refreshAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] })
          }}>
            <HabitCard 
              habits={habits}
              onUpdate={async (habitId) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                loadData(true);
              }}
              accessibilityLabel="Lista de hábitos"
            />
          </Animated.View>
          {/* </WalkthroughableView> */}
          {/* </CopilotStep> */}
          {/* <CopilotStep text="Utiliza el temporizador Pomodoro para concentrarte." order={5} name="pomodoro"> */}
          {/* <WalkthroughableView> */}
          <PomodoroCard accessibilityLabel="Pomodoro" />
          {/* </WalkthroughableView> */}
          {/* </CopilotStep> */}
        </DashboardScroll>
        {/* <CopilotStep text="Navega entre las secciones principales aquí." order={6} name="navbar"> */}
        {/* <WalkthroughableView> */}
        <FloatingNavBar activeTab="home" accessibilityLabel="Barra de navegación" />
        {/* </WalkthroughableView> */}
        {/* </CopilotStep> */}
      </ImageBackground>
    </View>
  );
};

// export default memo(copilot({
//   overlay: 'svg',
//   animated: true,
//   tooltipStyle: { borderRadius: 16, padding: 16 },
//   stepNumberTextStyle: { color: '#1ADDDB', fontWeight: 'bold' },
//   tooltipTextStyle: { color: '#030A24', fontSize: 16 },
//   backdropColor: 'rgba(3,10,36,0.7)'
// })(DashScreen));

export default memo(DashScreen);

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