import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  Vibration,
  Modal,
  Easing,
  Switch,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MeditationView from '../components/MeditationView';
import FloatingNavBar from '../components/FloatingNavBar';

const PomodoroScreen = () => {
  const navigation = useNavigation();
  
  // Estados del timer
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [mode, setMode] = useState('work');
  const progressAnimation = new Animated.Value(0);

  // Estados de las tareas (manteniendo la implementación simple que funcionaba)
  const [inputText, setInputText] = useState('');
  const [tasks, setTasks] = useState([]);

  // Agregar estado para el modal de timer personalizado
  const [customTimeModalVisible, setCustomTimeModalVisible] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('25');
  const [prepTimeEnabled, setPrepTimeEnabled] = useState(false);
  const [prepTime, setPrepTime] = useState('3');
  const [isPreparationPhase, setIsPreparationPhase] = useState(false);

  // Agregar estos nuevos estados para la animación
  const [buttonsOpacity] = useState(new Animated.Value(1));
  const [buttonsScale] = useState(new Animated.Value(1));
  const [mainControlsPosition] = useState(new Animated.Value(0));

  // Agregar estados para la animación de respiración
  const [isMeditating, setIsMeditating] = useState(false);

  // Agregar estado para la animación del navbar
  const [navBarAnim] = useState({
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(1)
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const modeTransition = useRef(new Animated.Value(0)).current;

  const modes = {
    work: {
      time: 25 * 60,
      color: '#FF6B6B',
      icon: 'brain',
      label: 'Trabajo'
    },
    break: {
      time: 5 * 60,
      color: '#4CAF50',
      icon: 'coffee',
      label: 'Descanso'
    },
    longBreak: {
      time: 15 * 60,
      color: '#2196F3',
      icon: 'beach',
      label: 'Descanso Largo'
    },
    meditation: {
      time: 10 * 60,
      color: '#9C27B0',
      icon: 'meditation',
      label: 'Meditación',
      breathCycle: 4, // 4 segundos inhalar, 4 segundos exhalar
    },
    custom: {
      time: 25 * 60,
      color: '#FF9800',
      icon: 'clock-edit',
      label: 'Personalizado'
    }
  };

  const motivationalMessages = [
    "¡Excelente trabajo! 💪",
    "¡Sigue así! 🌟",
    "¡Una sesión más completada! 🎯",
    "¡Tu concentración mejora cada día! 🧠",
    "¡Vas por buen camino! ✨"
  ];

  // Funciones del timer
  const toggleTimer = useCallback(() => {
    setIsActive(prev => {
      const willBeActive = !prev;
      
      Animated.parallel([
        Animated.timing(buttonsOpacity, {
          toValue: willBeActive ? 0 : 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(buttonsScale, {
          toValue: willBeActive ? 0.5 : 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(mainControlsPosition, {
          toValue: willBeActive ? 1 : 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();

      return willBeActive;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(modes[mode].time);
    progressAnimation.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [mode]);

  const toggleMode = useCallback(() => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft(modes[newMode].time);
    setIsActive(false);
    progressAnimation.setValue(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [mode]);

  const smoothModeTransition = (newMode) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    setMode(newMode);
  };

  const switchMode = (newMode) => {
    Animated.sequence([
      Animated.timing(modeTransition, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(modeTransition, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
    
    setTimeout(() => setMode(newMode), 150);
  };

  // Efecto del timer
  useEffect(() => {
    let interval = null;
    
    if (mode === 'meditation' && isActive) {
      setIsMeditating(true);
    } else {
      setIsMeditating(false);
    }

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => {
          const newTime = time - 1;
          const progress = 1 - (newTime / modes[mode].time);
          Animated.timing(progressAnimation, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false
          }).start();
          return newTime;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'meditation') {
        // Sonido suave al finalizar la meditación
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Vibration.vibrate([0, 500, 200, 500]);
      }
      const message = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      Alert.alert("¡Sesión Completada!", message);
      toggleMode();
    }

    return () => {
      clearInterval(interval);
      setIsMeditating(false);
    };
  }, [isActive, timeLeft, mode]);

  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0 && isActive) {
      // Parpadeo suave del tiempo restante
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 500,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true
        })
      ]).start(() => {
        if (timeLeft > 1) {
          // Repetir la animación
          toggleTimer();
        }
      });
    }
  }, [timeLeft]);

  // Funciones de tareas
  const handleAddTask = () => {
    if (inputText.trim()) {
      setTasks([...tasks, {
        id: Date.now(),
        text: inputText.trim(),
        completed: false
      }]);
      setInputText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleTask = (taskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        const completed = !task.completed;
        if (completed) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        return { ...task, completed };
      }
      return task;
    }));
  };

  const deleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Agregar efecto para guardar tareas
  useEffect(() => {
    const saveTasks = async () => {
      try {
        await AsyncStorage.setItem('pomodoroTasks', JSON.stringify(tasks));
      } catch (error) {
        console.error('Error guardando tareas:', error);
      }
    };
    saveTasks();
  }, [tasks]);

  // Agregar al inicio del componente
  useEffect(() => {
    const loadSavedTasks = async () => {
      try {
        const savedTasks = await AsyncStorage.getItem('pomodoroTasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        }
      } catch (error) {
        console.error('Error cargando tareas:', error);
      }
    };
    loadSavedTasks();
  }, []);

  const completedTasks = tasks.filter(task => task.completed).length;

  const clearCompletedTasks = () => {
    setTasks(tasks.filter(task => !task.completed));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Agregar componente para el modal de timer personalizado
  const CustomTimerModal = () => (
    <Modal
      visible={customTimeModalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setCustomTimeModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Timer Personalizado</Text>
          
          {/* Tiempo principal */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tiempo de trabajo</Text>
            <View style={styles.timeInputContainer}>
              <TextInput
                style={styles.timeInput}
                value={customMinutes}
                onChangeText={text => {
                  const numbers = text.replace(/[^0-9]/g, '');
                  setCustomMinutes(numbers);
                }}
                keyboardType="number-pad"
                maxLength={3}
                placeholder="25"
                placeholderTextColor="#A3B8E8"
              />
              <Text style={styles.timeUnit}>minutos</Text>
            </View>
          </View>

          {/* Opción de tiempo de preparación */}
          <View style={styles.prepTimeContainer}>
            <View style={styles.prepTimeHeader}>
              <Text style={styles.prepTimeLabel}>Tiempo de preparación</Text>
              <Switch
                value={prepTimeEnabled}
                onValueChange={setPrepTimeEnabled}
                trackColor={{ false: '#1D2B5F', true: '#1ADDDB' }}
                thumbColor={prepTimeEnabled ? '#FFFFFF' : '#A3B8E8'}
              />
            </View>
            
            {prepTimeEnabled && (
              <View style={styles.timeInputContainer}>
                <TextInput
                  style={styles.timeInput}
                  value={prepTime}
                  onChangeText={text => {
                    const numbers = text.replace(/[^0-9]/g, '');
                    setPrepTime(numbers);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="3"
                  placeholderTextColor="#A3B8E8"
                />
                <Text style={styles.timeUnit}>minutos</Text>
              </View>
            )}
          </View>

          {/* Botones */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setCustomTimeModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={() => {
                const workMinutes = parseInt(customMinutes) || 25;
                const preparationMinutes = prepTimeEnabled ? (parseInt(prepTime) || 3) : 0;
                
                if (prepTimeEnabled) {
                  setIsPreparationPhase(true);
                  setTimeLeft(preparationMinutes * 60);
                  modes.custom.prepTime = preparationMinutes * 60;
                } else {
                  setTimeLeft(workMinutes * 60);
                }
                
                modes.custom.time = workMinutes * 60;
                setMode('custom');
                setCustomTimeModalVisible(false);
                setIsActive(false);
                progressAnimation.setValue(0);
              }}
            >
              <Text style={styles.modalButtonText}>Iniciar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Función para ocultar/mostrar el navbar cuando se activa el timer
  useEffect(() => {
    Animated.parallel([
      Animated.timing(navBarAnim.translateY, {
        toValue: isActive ? 100 : 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(navBarAnim.opacity, {
        toValue: isActive ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, [isActive]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <View style={styles.headerContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="timer-outline" size={28} color="#1ADDDB" />
            <Text style={styles.headerTitle}>Pomodoro</Text>
          </View>
        </View>
      </View>
      <View style={styles.container}>
        <ScrollView style={styles.content}>
          {/* Timer Section */}
          <View style={styles.timerSection}>
            {mode === 'meditation' && isMeditating ? (
              <MeditationView />
            ) : (
              <>
                <Text style={[styles.modeLabel, { color: modes[mode].color }]}>
                  {modes[mode].label}
                </Text>
                <Text style={[styles.timerText, { color: modes[mode].color }]}>
                  {formatTime(timeLeft)}
                </Text>
              </>
            )}
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { 
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    }),
                    backgroundColor: modes[mode].color
                  }
                ]} 
              />
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controlsContainer}>
            {/* Primera fila de controles */}
            <Animated.View style={[
              styles.allControls,
              {
                transform: [{
                  translateX: mainControlsPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 80]
                  })
                }]
              }
            ]}>
              {/* Botones principales */}
              <View style={styles.mainControls}>
                <TouchableOpacity 
                  style={[
                    styles.controlButton, 
                    { backgroundColor: isActive ? '#FF5252' : modes[mode].color }
                  ]}
                  onPress={toggleTimer}
                >
                  <MaterialCommunityIcons 
                    name={isActive ? 'pause' : 'play'} 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.controlButton, styles.resetButton]}
                  onPress={resetTimer}
                >
                  <MaterialCommunityIcons 
                    name="restart" 
                    size={24} 
                    color="#FFFFFF" 
                  />
                </TouchableOpacity>
              </View>

              {/* Botones adicionales */}
              <Animated.View 
                style={[
                  styles.additionalControls,
                  {
                    opacity: buttonsOpacity,
                    transform: [{ scale: buttonsScale }],
                    pointerEvents: isActive ? 'none' : 'auto'
                  }
                ]}
              >
                <TouchableOpacity 
                  style={[
                    styles.controlButton, 
                    mode === 'break' && { backgroundColor: modes.break.color }
                  ]}
                  onPress={() => {
                    setMode('break');
                    setTimeLeft(modes.break.time);
                    setIsActive(false);
                    progressAnimation.setValue(0);
                  }}
                >
                  <MaterialCommunityIcons 
                    name="coffee" 
                    size={24} 
                    color={mode === 'break' ? '#FFFFFF' : '#4CAF50'} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.controlButton, 
                    mode === 'longBreak' && { backgroundColor: modes.longBreak.color }
                  ]}
                  onPress={() => {
                    setMode('longBreak');
                    setTimeLeft(modes.longBreak.time);
                    setIsActive(false);
                    progressAnimation.setValue(0);
                  }}
                >
                  <MaterialCommunityIcons 
                    name="beach" 
                    size={24} 
                    color={mode === 'longBreak' ? '#FFFFFF' : '#2196F3'} 
                  />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.controlButton, 
                    mode === 'custom' && { backgroundColor: modes.custom.color }
                  ]}
                  onPress={() => setCustomTimeModalVisible(true)}
                >
                  <MaterialCommunityIcons 
                    name="clock-edit" 
                    size={24} 
                    color={mode === 'custom' ? '#FFFFFF' : '#9C27B0'} 
                  />
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>

            {/* Segunda fila - Botón de meditación */}
            <Animated.View style={[
              styles.meditationButtonContainer,
              {
                opacity: buttonsOpacity,
                transform: [{ scale: buttonsScale }],
                pointerEvents: isActive ? 'none' : 'auto'
              }
            ]}>
              <TouchableOpacity 
                style={[
                  styles.meditationButton,
                  mode === 'meditation' && { backgroundColor: modes.meditation.color }
                ]}
                onPress={() => {
                  setMode('meditation');
                  setTimeLeft(modes.meditation.time);
                  setIsActive(false);
                  progressAnimation.setValue(0);
                }}
              >
                <MaterialCommunityIcons 
                  name="meditation" 
                  size={24} 
                  color={mode === 'meditation' ? '#FFFFFF' : '#9C27B0'} 
                />
                <Text style={[
                  styles.meditationButtonText,
                  mode === 'meditation' && { color: '#FFFFFF' }
                ]}>
                  Meditación
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Tasks Section */}
          <View style={styles.tasksSection}>
            <View style={styles.taskHeader}>
              <Text style={styles.title}>Tareas para esta sesión</Text>
              <Text style={styles.taskCount}>
                {completedTasks}/{tasks.length}
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Nueva tarea..."
                placeholderTextColor="#A3B8E8"
                autoCapitalize="sentences"
                onSubmitEditing={handleAddTask}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddTask}
              >
                <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.taskList}>
              {[...tasks]
                .sort((a, b) => {
                  if (a.completed === b.completed) return 0;
                  return a.completed ? 1 : -1;
                })
                .map(task => (
                  <View key={task.id} style={styles.taskItem}>
                    <TouchableOpacity
                      style={styles.checkbox}
                      onPress={() => toggleTask(task.id)}
                    >
                      <MaterialCommunityIcons
                        name={task.completed ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                        size={24}
                        color={task.completed ? '#4CAF50' : '#A3B8E8'}
                      />
                    </TouchableOpacity>
                    <Text style={[
                      styles.taskText,
                      task.completed && styles.completedText
                    ]}>
                      {task.text}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <MaterialCommunityIcons
                        name="close-circle"
                        size={20}
                        color="#FF5252"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>

            {tasks.some(task => task.completed) && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={clearCompletedTasks}
              >
                <Text style={styles.clearButtonText}>Limpiar completadas</Text>
              </TouchableOpacity>
            )}

            {tasks.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons 
                  name="clipboard-text-outline" 
                  size={48} 
                  color="#A3B8E8" 
                />
                <Text style={styles.emptyStateText}>
                  No hay tareas para esta sesión
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Agregar el modal al final del componente */}
        <CustomTimerModal />
      </View>
      <FloatingNavBar 
        activeTab="home"
        animValues={navBarAnim}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  container: {
    flex: 1,
    backgroundColor: '#030A24',
    paddingBottom: 85, // Agregar padding para el FloatingNavBar
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerAction: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  timerSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  modeLabel: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  controlsContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  allControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  mainControls: {
    flexDirection: 'row',
    gap: 8,
  },
  additionalControls: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resetButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tasksSection: {
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 16,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#1ADDDB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
  },
  checkbox: {
    marginRight: 12,
  },
  taskText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  completedText: {
    color: '#A3B8E8',
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    marginLeft: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  taskCount: {
    color: '#A3B8E8',
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  clearButtonText: {
    color: '#FF5252',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 24,
  },
  emptyStateText: {
    color: '#A3B8E8',
    fontSize: 16,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1D2B5F',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 8,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#FFFFFF',
    width: 100,
    textAlign: 'center',
  },
  timeUnit: {
    color: '#A3B8E8',
    fontSize: 16,
  },
  prepTimeContainer: {
    marginBottom: 24,
  },
  prepTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  prepTimeLabel: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  confirmButton: {
    backgroundColor: '#1ADDDB',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  meditationButtonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  meditationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
    width: '80%',
    borderWidth: 1,
    borderColor: 'rgba(156, 39, 176, 0.3)',
  },
  meditationButtonText: {
    color: '#9C27B0',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PomodoroScreen;
