import React, { useEffect, useRef, useState } from 'react';
import { 
  View, Text, StyleSheet, ImageBackground, TextInput, TouchableOpacity, Animated, ActivityIndicator, StatusBar, Alert 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const API_BASE_URL = 'https://antobackend.onrender.com';

const SignInScreen = () => {
  const navigation = useNavigation();
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);


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
      }),
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
      }),
    ]).start(() => {
      if (navigateTo) navigation.navigate(navigateTo);
    });
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignIn = async () => {
    const { email, password } = formData;

    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Introduce un correo válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión.');

      Alert.alert('Éxito', 'Inicio de sesión exitoso.');
      navigation.navigate('Dash');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
      <View style={styles.contentContainer}>
            <View style={styles.textContainer}>
              <Text style={styles.titleText}>Iniciar Sesión</Text>
              <Text style={styles.subTitleText}>Accede a tu cuenta</Text>
            </View>

            <View style={[styles.inputContainer]}>
              <TextInput
                style={styles.input}
                placeholder="Correo Electrónico"
                placeholderTextColor="#A3B8E8"
                keyboardType="email-address"
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                value={formData.email}
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="#A3B8E8"
                secureTextEntry={!isPasswordVisible}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                value={formData.password}
              />
            </View>

            <View style={[styles.buttonContainer]}>
              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={handleSignIn}
                style={[styles.mainButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
              >
                <Text style={styles.mainButtonText}>{isSubmitting ? 'Ingresando...' : 'Ingresar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPressIn={handlePressIn}
                onPressOut={() => handlePressOut('Register')}
                style={[styles.secondaryButton, { transform: [{ scale: buttonScale }], opacity: buttonOpacity }]}
              >
                <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.forgotPasswordText} onPress={() => handlePressOut('Recover')}>
              ¿Olvidaste tu contraseña?
            </Text>
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageStyle: {
    opacity: 0.1,
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
  },
  loadingIndicator: {
    marginBottom: 30,
  },
  titleText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  subTitleText: {
    fontSize: 20,
    color: '#A3B8E8',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  buttonContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },

  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 60,
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
    borderColor: 'rgba(26, 221, 219, 0.9)',
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: 'rgba(26, 221, 219, 0.9)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    marginTop: 30,
    fontSize: 16,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});

export default SignInScreen;
