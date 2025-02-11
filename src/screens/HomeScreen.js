import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, ImageBackground, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (navigateTo) => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start(() => {
      if (navigateTo) navigation.navigate(navigateTo);
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>  
          {isLoading ? (
            <ActivityIndicator size="large" color="#5473C2" style={styles.loadingIndicator} />
          ) : (
            <>
              <Text style={styles.titleText}>¡Bienvenido!</Text>
              <Text style={styles.subTitleText}>Nos alegra verte aquí.</Text>

              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={() => handlePressOut('SignIn')}
                style={styles.mainButton}
              >
                <Text style={styles.mainButtonText}>Iniciar Sesión</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={() => handlePressOut('Register')}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E1A57',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    opacity: 0.15,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingIndicator: {
    marginBottom: 30,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subTitleText: {
    fontSize: 16,
    color: '#A3ADDB',
    textAlign: 'center',
    marginBottom: 30,
  },
  mainButton: {
    backgroundColor: '#5127DB',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 15,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    borderColor: '#5473C2',
    borderWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#5473C2',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default HomeScreen;