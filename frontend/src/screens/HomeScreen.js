import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ImageBackground, 
  StatusBar, 
  Animated, 
  ActivityIndicator, 
  TouchableOpacity 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ParticleBackground from '../components/ParticleBackground';
import AnimatedButton from '../components/AnimatedButton';
import EmotionBanner from '../components/EmotionBanner';
import emotions from '../data/emotions';
import { ROUTES } from '../../constants/routes';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(true);
  
  // Valores para animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  // Efecto para la animación inicial
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

  // Función para manejar la navegación
  const handleNavigation = (screen) => {
    switch(screen) {
      case 'SignIn':
        navigation.navigate(ROUTES.SIGN_IN);
        break;
      case 'Register':
        navigation.navigate(ROUTES.REGISTER);
        break;
      case 'Chat':
        navigation.navigate(ROUTES.CHAT);
        break;
      // Añadir otros casos si es necesario
      default:
        navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground 
        source={require('../images/back.png')} 
        style={styles.background} 
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        <View style={styles.contentContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#1ADDDB" style={styles.loadingIndicator} />
          ) : (
            <>
              <Animated.View 
                style={[
                  styles.textContainer, 
                  { 
                    opacity: fadeAnim, 
                    transform: [{ translateY: translateYAnim }] 
                  }
                ]}
              >
                <Text style={styles.titleText}>¡Bienvenido!</Text>
                <Text style={styles.subTitleText}>Nos alegra verte aquí.</Text>
              </Animated.View>

              <Animated.View 
                style={[
                  styles.buttonContainer, 
                  { 
                    opacity: fadeAnim, 
                    transform: [{ translateY: translateYAnim }] 
                  }
                ]}
              >
                <AnimatedButton
                  title="Iniciar Sesión"
                  onPress={() => handleNavigation(ROUTES.SIGN_IN)}
                  buttonScale={buttonScale}
                  buttonOpacity={buttonOpacity}
                  accessibilityLabel="Iniciar Sesión"
                  accessibilityHint="Toca para ir a la pantalla de inicio de sesión"
                  isPrimary={true}
                />

                <AnimatedButton
                  title="Crear cuenta"
                  onPress={() => handleNavigation(ROUTES.REGISTER)}
                  buttonScale={buttonScale}
                  buttonOpacity={buttonOpacity}
                  accessibilityLabel="Crear Cuenta"
                  accessibilityHint="Toca para ir a la pantalla de registro"
                  isPrimary={false}
                />
              </Animated.View>

              <View style={styles.footerContainer}>
                <EmotionBanner 
                  emotions={emotions} 
                  onPress={() => handleNavigation('Chat')}
                />
                <Text 
                  style={styles.FQText} 
                  onPress={() => handleNavigation('FaQ')}
                >
                  Preguntas Frecuentes
                </Text>
              </View>
            </>
          )}
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
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
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
    color: 'white',
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
  footerContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    alignItems: 'center',
  },
  FQText: {
    fontSize: 15,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
    marginTop: 10,
  },
});

export default HomeScreen;