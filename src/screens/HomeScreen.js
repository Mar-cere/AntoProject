import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, ImageBackground, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados y refs para la animación de emociones
  const [currentEmotion, setCurrentEmotion] = useState(0);
  const emotionOpacity = useRef(new Animated.Value(1)).current;
  const emotionTranslateX = useRef(new Animated.Value(0)).current;
  
  // Lista ampliada de emociones para mostrar
  const emotions = [
    // Emociones negativas - masculinas
    "¿Abrumado?",
    "¿Ansioso?",
    "¿Triste?",
    "¿Confundido?",
    "¿Estresado?",
    "¿Preocupado?",
    "¿Agobiado?",
    "¿Inseguro?",
    "¿Frustrado?",
    "¿Cansado?",
    "¿Desmotivado?",
    "¿Asustado?",
    "¿Irritado?",
    "¿Decepcionado?",
    
    // Emociones negativas - femeninas
    "¿Abrumada?",
    "¿Ansiosa?",
    "¿Triste?",
    "¿Confundida?",
    "¿Estresada?",
    "¿Preocupada?",
    "¿Agobiada?",
    "¿Insegura?",
    "¿Frustrada?",
    "¿Cansada?",
    "¿Desmotivada?",
    "¿Asustada?",
    "¿Irritada?",
    "¿Decepcionada?",
    
    // Emociones positivas - masculinas
    "¿Feliz?",
    "¿Emocionado?",
    "¿Motivado?",
    "¿Inspirado?",
    "¿Entusiasmado?",
    "¿Optimista?",
    "¿Esperanzado?",
    "¿Agradecido?",

    
    // Emociones positivas - femeninas
    "¿Feliz?",
    "¿Emocionada?",
    "¿Motivada?",
    "¿Inspirada?",
    "¿Entusiasmada?",
    "¿Optimista?",
    "¿Esperanzada?",
    "¿Agradecida?",

    
    // Emociones neutras o estados
    "¿Pensativo?",
    "¿Pensativa?",
    "¿Reflexivo?",
    "¿Reflexiva?",
    "¿Curioso?",
    "¿Curiosa?",
    "¿Indeciso?",
    "¿Indecisa?",
    "¿Nostálgico?",
    "¿Nostálgica?",
    "¿Sorprendido?",
    "¿Sorprendida?",
    "¿Distraído?",
    "¿Distraída?",
    
    // Emociones relacionadas con la salud mental
    "¿Con ansiedad?",
    "¿Con depresión?",
    "¿Con pánico?",
    "¿Con insomnio?",
    "¿Aislado?",
    "¿Aislada?",
    "¿Sobrepasado?",
    "¿Sobrepasada?",
    
    // Frases alternativas
    "¿Necesitas hablar?",
    "¿Buscas apoyo?",
    "¿Te sientes solo?",
    "¿Te sientes sola?",
    "¿Con dudas?",
  ];
  
  // Referencia para mantener un seguimiento de las emociones mostradas recientemente
  const recentEmotionsRef = useRef([]);
  const MAX_RECENT_EMOTIONS = 20; // Número de emociones recientes a recordar
  
  // Función para obtener la siguiente emoción sin repetir las recientes
  const getNextEmotion = useCallback(() => {
    // Filtrar las emociones que no se han mostrado recientemente
    const availableEmotions = emotions
      .map((emotion, index) => ({ emotion, index }))
      .filter(item => !recentEmotionsRef.current.includes(item.index));
    
    // Si todas las emociones han sido mostradas recientemente, usar todas
    const emotionsToChooseFrom = availableEmotions.length > 0 ? 
      availableEmotions : 
      emotions.map((emotion, index) => ({ emotion, index }));
    
    // Seleccionar una emoción aleatoria
    const randomIndex = Math.floor(Math.random() * emotionsToChooseFrom.length);
    const selectedEmotionIndex = emotionsToChooseFrom[randomIndex].index;
    
    // Añadir a la lista de emociones recientes
    recentEmotionsRef.current.push(selectedEmotionIndex);
    
    // Mantener solo las últimas MAX_RECENT_EMOTIONS
    if (recentEmotionsRef.current.length > MAX_RECENT_EMOTIONS) {
      recentEmotionsRef.current.shift(); // Eliminar la más antigua
    }
    
    return selectedEmotionIndex;
  }, [emotions]);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start();
    }, 1500);
  }, []);
  
  // Efecto para cambiar la emoción cada 3.2 segundos con animación
  useEffect(() => {
    if (isLoading) return; // No iniciar la animación durante la carga
    
    // Inicializar con una emoción aleatoria
    if (recentEmotionsRef.current.length === 0) {
      const initialEmotion = Math.floor(Math.random() * emotions.length);
      recentEmotionsRef.current.push(initialEmotion);
      setCurrentEmotion(initialEmotion);
    }
    
    const changeEmotion = () => {
      // Secuencia de animación para salida
      Animated.parallel([
        Animated.timing(emotionOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(emotionTranslateX, {
          toValue: -40, // Aumentado para textos más largos
          duration: 400,
          useNativeDriver: true,
        })
      ]).start(() => {
        // Cambiar a la siguiente emoción
        setCurrentEmotion(getNextEmotion());
        
        // Resetear la posición para la entrada
        emotionTranslateX.setValue(40); // Aumentado para textos más largos
        
        // Secuencia de animación para entrada
        Animated.parallel([
          Animated.timing(emotionOpacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(emotionTranslateX, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          })
        ]).start();
      });
    };
    
    // Configurar el intervalo para cambiar la emoción
    const interval = setInterval(changeEmotion, 3200); // Tiempo aumentado para leer textos más largos
    
    // Limpiar el intervalo cuando el componente se desmonte
    return () => clearInterval(interval);
  }, [isLoading, getNextEmotion, emotions]);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = (navigateTo) => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      if (navigateTo) navigation.navigate(navigateTo);
    });
  };

  // Componente de partículas animadas
  const ParticleBackground = () => {
    // Crea 10 partículas con posiciones y animaciones aleatorias
    const particles = Array(10).fill(0).map((_, i) => {
      // Posiciones iniciales
      const initialPosX = Math.random() * Dimensions.get('window').width;
      const initialPosY = Math.random() * Dimensions.get('window').height;
      
      // Valores para animación de transform
      const translateX = useRef(new Animated.Value(0)).current;
      const translateY = useRef(new Animated.Value(0)).current;
      const opacity = useRef(new Animated.Value(Math.random() * 0.5 + 0.1)).current;
      const size = Math.random() * 4 + 2;
      
      useEffect(() => {
        // Animación de opacidad
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
        
        // Animación de movimiento con transform
        Animated.loop(
          Animated.sequence([
            Animated.timing(translateX, {
              toValue: Math.random() * 50 - 25, // Movimiento de -25 a +25
              duration: 8000 + Math.random() * 7000,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: Math.random() * 50 - 25, // Movimiento de -25 a +25
              duration: 8000 + Math.random() * 7000,
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
            transform: [
              { translateX: translateX },
              { translateY: translateY }
            ]
          }}
        />
      );
    });
    
    return <>{particles}</>;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <ParticleBackground />
        <View style={styles.contentContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#1ADDDB" style={styles.loadingIndicator} />
          ) : (
            <>
              <Animated.View style={[styles.textContainer, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>
                <Text style={styles.titleText}>¡Bienvenido!</Text>
                <Text style={styles.subTitleText}>Nos alegra verte aquí.</Text>
              </Animated.View>

              <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>
                <TouchableOpacity
                  accessible={true}
                  accessibilityLabel="Iniciar Sesión"
                  accessibilityHint="Toca para ir a la pantalla de inicio de sesión"
                  accessibilityRole="button"
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut('SignIn')}
                  style={[styles.mainButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
                >
                  <Text style={styles.mainButtonText}>Iniciar Sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessible={true}
                  accessibilityLabel="Crear Cuenta"
                  accessibilityHint="Toca para ir a la pantalla de registro"
                  accessibilityRole="button"
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut('Register')}
                  style={[styles.secondaryButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
                >
                  <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.footerContainer}>
                <TouchableOpacity 
                  style={styles.emergencyContainer}
                  onPress={() => handlePressOut('EmergencyChat')}
                  activeOpacity={0.7}
                >
                  <View style={styles.emergencyTextContainer}>
                    <View style={styles.emotionContainer}>
                      <Animated.Text 
                        style={[
                          styles.emotionText, 
                          { 
                            opacity: emotionOpacity,
                            transform: [{ translateX: emotionTranslateX }]
                          }
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {emotions[currentEmotion]}
                      </Animated.Text>
                    </View>
                    <Text style={styles.emergencyText} numberOfLines={1}>
                      {" Ingresa al chat de emergencia"}
                    </Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.FQText} onPress={() => handlePressOut('FAQ')}>
                  Preguntas Frecuentes
                </Text>
              </View>
            </>
          )}
        </View>
      </ImageBackground>
      <Text style={styles.versionText}>Versión 1.0.0</Text>
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
    resizeMode: 'cover',
    justifyContent: 'center',
  },
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingIndicator: {
    transform: [{ scale: 1.5 }],
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subTitleText: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
  },
  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.8)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  secondaryButtonText: {
    color: 'rgba(26, 221, 219, 0.8)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  footerContainer: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 50,
  },
  emergencyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emergencyTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    maxWidth: '95%',
  },
  emotionContainer: {
    width: 130, // Ancho aumentado para acomodar textos más largos
    alignItems: 'center',
    justifyContent: 'center',
    height: 24, // Altura fija para mantener la alineación
  },
  emotionText: {
    fontSize: 15,
    color: '#1ADDDB',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emergencyText: {
    fontSize: 15,
    color: '#1ADDDB',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  FQText: {
    fontSize: 15,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
  versionText: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default HomeScreen;
