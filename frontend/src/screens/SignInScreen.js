import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ImageBackground, TextInput, TouchableOpacity, 
  Animated, ActivityIndicator, StatusBar, Alert, Dimensions, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import { api, ENDPOINTS, login } from '../config/api';
import { ROUTES } from '../../constants/routes';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles, colors } from '../styles/globalStyles';


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

  // Efecto de entrada con animación
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: Number(1),
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

  // Opcionalmente, podemos cargar el email si está guardado
  useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('savedEmail');
        if (savedEmail) {
          setFormData(prev => ({ ...prev, email: savedEmail }));
        }
      } catch (error) {
        console.error('Error al cargar email guardado:', error);
      }
    };
    
    loadSavedEmail();
  }, []);

  // Manejadores de eventos
  const handlePressIn = useCallback(() => {
    Animated.parallel([
      Animated.spring(buttonScale, {
        toValue: 0.95,
        friction: 8,
        tension: 100,
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
    // Si el campo es email, normalizar a minúsculas
    if (field === 'email') {
      value = value.toLowerCase().trim();
    }
    
    setFormData((prevData) => ({ ...prevData, [field]: value }));
    
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

  // Función para manejar el inicio de sesión
  const handleLogin = async () => {
    try {
      setIsSubmitting(true);

      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const response = await api.post(ENDPOINTS.LOGIN, {
        email: formData.email.toLowerCase().trim(),
        password: formData.password
      });

      console.log('Respuesta del servidor:', response);

      if (response.token && response.user) {
        // Guardamos los datos del usuario
        await Promise.all([
          AsyncStorage.setItem('userToken', response.token),
          AsyncStorage.setItem('userData', JSON.stringify(response.user)),
          AsyncStorage.setItem('savedEmail', formData.email)
        ]);

        // Navegamos al Dashboard y limpiamos el stack de navegación
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DASHBOARD }],
        });
      } else {
        Alert.alert(
          'Error',
          'No se pudo iniciar sesión. Por favor, intenta de nuevo.'
        );
      }
    } catch (error) {
      console.error('Error en login:', error);
      
      let errorMessage = 'Hubo un problema al iniciar sesión';
      
      if (error.response?.status === 401) {
        errorMessage = 'Correo o contraseña incorrectos';
      } else if (error.response?.status === 429) {
        errorMessage = 'Demasiados intentos. Por favor, espera un momento';
      } else if (!error.response) {
        errorMessage = 'Error de conexión. Verifica tu internet';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isButtonDisabled = Boolean(
    isSubmitting || 
    isLoading || 
    !formData.email || 
    !formData.password ||
    errors.email || 
    errors.password
  );

  useEffect(() => {
    setErrors({ email: '', password: '' });
    return () => {
      // Limpieza al desmontar
      setFormData({ email: '', password: '' });
      setErrors({ email: '', password: '' });
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground 
        source={require('../images/back.png')} 
        style={styles.background} 
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

                  <View style={globalStyles.inputWrapper}>
                    <View style={[
                      globalStyles.inputContainer, 
                      errors.email && globalStyles.inputError
                    ]}>
                      <Ionicons name="mail-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                      <TextInput
                        style={globalStyles.input}
                        placeholder="Correo Electrónico"
                        placeholderTextColor={errors.email ? colors.error : colors.accent}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        onChangeText={(text) => handleInputChange('email', text)}
                        value={formData.email}
                        accessibilityLabel="Correo Electrónico"
                      />
                    </View>
                    {errors.email ? <Text style={globalStyles.errorText}>{errors.email}</Text> : null}
                  </View>

                  <View style={globalStyles.inputWrapper}>
                    <View style={[
                      globalStyles.inputContainer, 
                      errors.password && globalStyles.inputError
                    ]}>
                      <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                      <TextInput
                        style={globalStyles.input}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.accent}
                        secureTextEntry={!isPasswordVisible}
                        onChangeText={(text) => handleInputChange('password', text)}
                        value={formData.password}
                        accessibilityLabel="Contraseña"
                      />
                      <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)} style={globalStyles.inputIcon}>
                        <Ionicons name={isPasswordVisible ? "eye-off" : "eye"} size={20} color={colors.accent} />
                      </TouchableOpacity>
                    </View>
                    {errors.password ? <Text style={globalStyles.errorText}>{errors.password}</Text> : null}
                  </View>

                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      onPressIn={handlePressIn}
                      onPress={handleLogin}
                      disabled={Boolean(isButtonDisabled)}
                      style={[
                        styles.mainButton,
                        {
                          transform: [{ scale: buttonScale }],
                          opacity: isButtonDisabled ? 0.5 : buttonOpacity,
                          backgroundColor: isButtonDisabled ? 
                            'rgba(26, 221, 219, 0.5)' : 
                            'rgba(26, 221, 219, 0.9)'
                        }
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
                      onPressOut={() => handlePressOut(ROUTES.REGISTER)}
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
                    onPress={() => handlePressOut(ROUTES.RECOVER_PASSWORD)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.forgotPasswordText}>
                      ¿Olvidaste tu contraseña?
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Home')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="arrow-back" size={24} color="#1ADDDB" />
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  ...globalStyles,
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
