import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ImageBackground, TextInput, TouchableOpacity, 
  Animated, ActivityIndicator, StatusBar, Alert, Dimensions 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://antobackend.onrender.com';

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

const SignInScreen = () => {
  const navigation = useNavigation();
  
  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;
  
  // Estados
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(true);

  // Efecto de entrada
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
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
    }, 500);
  }, []);

  // Manejadores de eventos
  const handlePressIn = useCallback(() => {
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
  }, [buttonScale, buttonOpacity]);

  const handlePressOut = useCallback((navigateTo) => {
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
  }, [buttonScale, buttonOpacity, navigation]);

  // Validación
  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validateForm = useCallback(() => {
    const newErrors = { email: '', password: '' };
    let isValid = true;

    if (!formData.email) {
      newErrors.email = 'El correo es obligatorio';
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Introduce un correo válido';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [formData]);

  // Manejo de cambios en los inputs
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validación en tiempo real
    if (field === 'email') {
      if (!value) {
        setErrors(prev => ({ ...prev, email: 'El correo es obligatorio' }));
      } else if (!validateEmail(value)) {
        setErrors(prev => ({ ...prev, email: 'Introduce un correo válido' }));
      } else {
        setErrors(prev => ({ ...prev, email: '' }));
      }
    }
    
    if (field === 'password') {
      if (!value) {
        setErrors(prev => ({ ...prev, password: 'La contraseña es obligatoria' }));
      } else if (value.length < 6) {
        setErrors(prev => ({ ...prev, password: 'La contraseña debe tener al menos 6 caracteres' }));
      } else {
        setErrors(prev => ({ ...prev, password: '' }));
      }
    }
  }, []);

  // Inicio de sesión
  const handleSignIn = useCallback(async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al iniciar sesión');
      }

      // Guardar token o datos de usuario si es necesario
      // localStorage.setItem('token', data.token);
      
      Alert.alert('Éxito', 'Inicio de sesión exitoso');
      navigation.navigate('Dash');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, navigation]);

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
            <Animated.View 
              style={[
                styles.formContainer, 
                { 
                  opacity: fadeAnim,
                  transform: [{ translateY: translateYAnim }] 
                }
              ]}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Iniciar Sesión</Text>
                <Text style={styles.subTitleText}>Accede a tu cuenta</Text>
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[styles.input, errors.email ? styles.inputError : null]}
                    placeholder="Correo Electrónico"
                    placeholderTextColor="#A3B8E8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => handleInputChange('email', text)}
                    value={formData.email}
                  />
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>
                
                <View style={styles.inputWrapper}>
                  <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Contraseña"
                      placeholderTextColor="#A3B8E8"
                      secureTextEntry={!isPasswordVisible}
                      onChangeText={(text) => handleInputChange('password', text)}
                      value={formData.password}
                    />
                    <TouchableOpacity 
                      onPress={() => setPasswordVisible(!isPasswordVisible)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons 
                        name={isPasswordVisible ? "eye-off" : "eye"} 
                        size={24} 
                        color="#A3B8E8" 
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={isSubmitting ? null : handleSignIn}
                  disabled={isSubmitting}
                  style={[
                    styles.mainButton, 
                    { transform: [{ scale: buttonScale }], opacity: buttonOpacity }
                  ]}
                  activeOpacity={0.8}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.mainButtonText}>Ingresar</Text>
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPressIn={handlePressIn}
                  onPressOut={() => handlePressOut('Register')}
                  style={[
                    styles.secondaryButton, 
                    { transform: [{ scale: buttonScale }], opacity: buttonOpacity }
                  ]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryButtonText}>Crear Cuenta</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                onPress={() => handlePressOut('Recover')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#1ADDDB" />
                <Text style={styles.backButtonText}>Volver</Text>
              </TouchableOpacity>
            </Animated.View>
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
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  loadingIndicator: {
    transform: [{ scale: 1.5 }],
  },
  textContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  titleText: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subTitleText: {
    fontSize: 20,
    color: '#A3B8E8',
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordContainer: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#FFFFFF',
  },
  eyeIcon: {
    paddingHorizontal: 15,
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 5,
    marginLeft: 10,
  },
  buttonContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: '100%',
    maxWidth: 300,
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
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  secondaryButtonText: {
    color: 'rgba(26, 221, 219, 0.9)',
    fontSize: 20,
    fontWeight: 'bold',
  },
  forgotPasswordText: {
    marginTop: 20,
    fontSize: 16,
    color: '#1ADDDB',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1ADDDB',
    marginLeft: 5,

  },
});

export default SignInScreen;
