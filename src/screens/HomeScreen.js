import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, ImageBackground, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <View style={styles.contentContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#1ADDDB" style={styles.loadingIndicator} />
          ) : (
            <>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>¡Bienvenido!</Text>
                <Text style={styles.subTitleText}>Nos alegra verte aquí.</Text>
              </View>
              <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim, transform: [{ translateY: translateYAnim }] }]}>  
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut('SignIn')}
                  style={[styles.mainButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
                >
                  <Text style={styles.mainButtonText}>Iniciar Sesión</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut('Register')}
                  style={[styles.secondaryButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
                >
                  <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
                </TouchableOpacity>
              </Animated.View>
              <View style={styles.footerContainer}>
                <Text style={styles.emergencyText} onPress={() => handlePressOut('EmergencyChat')}>
                  ¿Necesitas ayuda? Ingresa al chat de emergencia.
                </Text>
                <Text style={styles.FQText} onPress={() => handlePressOut('EmergencyChat')}>
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
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    opacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical:16,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 90,
    marginTop:10,
  },
  loadingIndicator: {
    marginBottom: 30,
  },
  titleText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  subTitleText: {
    fontSize: 22,
    color: '#A3B8E8',
    textAlign: 'center',
    marginBottom: 40,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop:80,
  },
  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: 'rgba(26, 221, 219, 0.8)',
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    marginBottom:20,
  },
  emergencyText: {
    marginTop: 90,
    fontSize: 14,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  FQText: {
    marginTop: 20,
    fontSize: 14,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default HomeScreen;
