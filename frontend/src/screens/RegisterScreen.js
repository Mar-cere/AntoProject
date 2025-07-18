import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, ImageBackground, TouchableOpacity, Alert, ActivityIndicator, Animated
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import { api, ENDPOINTS } from '../config/api';
import { ROUTES } from '../constants/routes';
import { handleApiError, checkServerConnection } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkServerStatus } from '../utils/networkUtils';
import { globalStyles, colors } from '../styles/globalStyles';

const RegisterScreen = ({ navigation }) => {
  // Referencias para animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [isTermsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false); // Para mostrar info sobre username

  // Efecto de entrada con animación
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

  useEffect(() => {
    const verifyConnection = async () => {
      const isConnected = await checkServerConnection();
      if (!isConnected) {
        Alert.alert(
          'Error de conexión',
          'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.',
          [{ text: 'OK' }]
        );
      }
    };

    verifyConnection();
  }, []);

  // Validación de email
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Manejo de cambios en los inputs con validación en tiempo real
  const handleInputChange = (field, value) => {
    // Si el campo es email, normalizar a minúsculas
    if (field === 'email') {
      value = value.toLowerCase().trim();
    }
    
    // Si el campo es username, normalizar (solo alfanuméricos)
    if (field === 'username') {
      value = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
    
    setFormData((prevData) => ({ ...prevData, [field]: value }));

    // Validación en tiempo real
    let updatedErrors = { ...errors };

    if (field === 'name') {
      if (value && value.length < 2) {
        updatedErrors.name = 'El nombre debe tener al menos 2 caracteres';
      } else if (value && value.length > 50) {
        updatedErrors.name = 'El nombre debe tener máximo 50 caracteres';
      } else {
        delete updatedErrors.name;
      }
    }

    if (field === 'username') {
      if (!value.trim()) {
        updatedErrors.username = 'El nombre de usuario es obligatorio';
      } else if (value.length < 3) {
        updatedErrors.username = 'Mínimo 3 caracteres';
      } else if (value.length > 20) {
        updatedErrors.username = 'Máximo 20 caracteres';
      } else {
        delete updatedErrors.username;
      }
    }

    if (field === 'email') {
      if (!value.trim()) {
        updatedErrors.email = 'El correo es obligatorio';
      } else if (!validateEmail(value)) {
        updatedErrors.email = 'Introduce un correo válido';
      } else {
        delete updatedErrors.email;
      }
    }

    if (field === 'password') {
      if (!value) {
        updatedErrors.password = 'La contraseña es obligatoria';
      } else if (value.length < 8) {
        updatedErrors.password = 'La contraseña debe tener al menos 8 caracteres';
      } else {
        delete updatedErrors.password;
      }
      
      // Actualizar validación de confirmPassword si ya tiene un valor
      if (formData.confirmPassword) {
        if (value !== formData.confirmPassword) {
          updatedErrors.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          delete updatedErrors.confirmPassword;
        }
      }
    }

    if (field === 'confirmPassword') {
      if (!value) {
        updatedErrors.confirmPassword = 'Debes confirmar la contraseña';
      } else if (value !== formData.password) {
        updatedErrors.confirmPassword = 'Las contraseñas no coinciden';
      } else {
        delete updatedErrors.confirmPassword;
      }
    }

    setErrors(updatedErrors);
  };

  // Validación completa del formulario
  const validateForm = () => {
    const newErrors = {};
    
    if (formData.name && formData.name.trim()) {
      if (formData.name.length < 2) {
        newErrors.name = 'El nombre debe tener al menos 2 caracteres';
      } else if (formData.name.length > 50) {
        newErrors.name = 'El nombre debe tener máximo 50 caracteres';
      }
    }
    
    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es obligatorio';
    } else if (formData.username.length < 3) {
      newErrors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
    } else if (formData.username.length > 20) {
      newErrors.username = 'El nombre de usuario debe tener máximo 20 caracteres';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Introduce un correo válido';
    }
    
    if (!formData.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar la contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    if (!isTermsAccepted) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejo de animación al presionar
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  // Manejo del registro usando userService
  const handleRegister = async () => {
    try {
      if (!validateForm()) return;

      setIsSubmitting(true);
      setIsLoading(true);

      // Verificar conexión con el servidor
      const isServerAvailable = await checkServerStatus(3);
      if (!isServerAvailable) {
        Alert.alert(
          'Error de conexión',
          'No se pudo establecer conexión con el servidor. Por favor:\n\n' +
          '1. Verifica tu conexión a internet\n' +
          '2. Espera unos minutos y vuelve a intentar\n' +
          '3. Si el problema persiste, contacta al soporte',
          [{ text: 'Entendido' }]
        );
        return;
      }

      console.log('Servidor disponible, iniciando registro...');

      const userData = {
        email: formData.email.toLowerCase().trim(),
        username: formData.username.toLowerCase().trim(),
        password: formData.password,
        ...(formData.name && formData.name.trim() ? { name: formData.name.trim() } : {})
      };

      console.log('Enviando datos:', {
        ...userData,
        password: '***HIDDEN***'
      });

      const response = await fetch('https://antobackend.onrender.com/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Error en el registro');
      }

      // Verificar si la respuesta tiene los tokens esperados
      if (data.accessToken && data.refreshToken && data.user) {
        // Guardamos los datos del usuario y tokens
        await Promise.all([
          AsyncStorage.setItem('userToken', data.accessToken),
          AsyncStorage.setItem('refreshToken', data.refreshToken),
          AsyncStorage.setItem('userData', JSON.stringify(data.user)),
          AsyncStorage.setItem('savedEmail', formData.email)
        ]);

        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DASHBOARD }],
        });
      } else if (data.token && data.user) {
        // Compatibilidad con respuesta anterior (fallback)
        await Promise.all([
          AsyncStorage.setItem('userToken', data.token),
          AsyncStorage.setItem('userData', JSON.stringify(data.user)),
          AsyncStorage.setItem('savedEmail', formData.email)
        ]);

        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DASHBOARD }],
        });
      } else {
        throw new Error('No se recibió token de autenticación');
      }

    } catch (error) {
      console.error('Error detallado:', error);
      let errorMessage = 'Ocurrió un error durante el registro';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Error de conexión. Por favor:\n\n' +
          '1. Verifica tu conexión a internet\n' +
          '2. Intenta nuevamente en unos momentos\n' +
          '3. Si el problema persiste, contacta al soporte';
      } else if (error.message.includes('already exists') || error.message.includes('ya está en uso')) {
        errorMessage = 'El email o nombre de usuario ya está registrado';
      } else if (error.message.includes('Datos inválidos')) {
        errorMessage = 'Por favor, verifica que todos los campos sean correctos';
      } else if (error.message.includes('Demasiados intentos')) {
        errorMessage = 'Demasiados intentos de registro. Por favor, espera un momento';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      Alert.alert(
        'Error en el registro',
        errorMessage,
        [{ text: 'Entendido' }]
      );
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>
        <ParticleBackground />

        {isLoading ? (
          <ActivityIndicator size="large" color="#1ADDDB" style={styles.loadingIndicator} />
        ) : (
          <Animated.View 
            style={[
              styles.content,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }] 
              }
            ]}
          >
            <Text style={styles.title}>Crear Cuenta</Text>
            <Text style={styles.subtitle}>Por favor, llena los campos para registrarte.</Text>

            {/* Campo de Nombre (Opcional) */}
            <View style={globalStyles.inputWrapper}>
              <View style={[
                globalStyles.inputContainer, 
                errors.name && globalStyles.inputError
              ]}>
                <Ionicons name="person" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                <TextInput
                  style={globalStyles.input}
                  placeholder="Nombre completo (opcional)"
                  placeholderTextColor={colors.accent}
                  autoCapitalize="words"
                  onChangeText={(text) => handleInputChange('name', text)}
                  value={formData.name}
                  accessibilityLabel="Nombre completo"
                />
              </View>
              {errors.name ? <Text style={globalStyles.errorText}>{errors.name}</Text> : null}
            </View>

            {/* Campo de Username */}
            <View style={globalStyles.inputWrapper}>
              <View style={[
                globalStyles.inputContainer, 
                errors.username && globalStyles.inputError
              ]}>
                <Ionicons name="person-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                <TextInput
                  style={globalStyles.input}
                  placeholder="Nombre de usuario"
                  placeholderTextColor={colors.accent}
                  autoCapitalize="none"
                  onChangeText={(text) => handleInputChange('username', text)}
                  value={formData.username}
                  accessibilityLabel="Nombre de usuario"
                />
              </View>
              {errors.username ? <Text style={globalStyles.errorText}>{errors.username}</Text> : null}
            </View>

            {/* Campo de Correo */}
            <View style={globalStyles.inputWrapper}>
              <View style={[
                globalStyles.inputContainer, 
                errors.email && globalStyles.inputError
              ]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                <TextInput
                  style={globalStyles.input}
                  placeholder="Correo Electrónico"
                  placeholderTextColor={colors.accent}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(text) => handleInputChange('email', text)}
                  value={formData.email}
                  accessibilityLabel="Correo Electrónico"
                />
              </View>
              {errors.email ? <Text style={globalStyles.errorText}>{errors.email}</Text> : null}
            </View>

            {/* Campo de Contraseña */}
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
                <TouchableOpacity 
                  onPress={() => setPasswordVisible(!isPasswordVisible)}
                  style={globalStyles.eyeIcon}
                >
                  <Ionicons 
                    name={isPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={globalStyles.errorText}>{errors.password}</Text> : null}
            </View>
            
            {/* Confirmación de Contraseña */}
            <View style={globalStyles.inputWrapper}>
              <View style={[
                globalStyles.inputContainer, 
                errors.confirmPassword && globalStyles.inputError
              ]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                <TextInput 
                  style={globalStyles.input} 
                  placeholder="Confirma tu Contraseña" 
                  placeholderTextColor={colors.accent}
                  secureTextEntry={!isConfirmPasswordVisible}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)} 
                  value={formData.confirmPassword} 
                  accessibilityLabel="Confirma tu Contraseña"
                />
                <TouchableOpacity 
                  onPress={() => setConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  style={globalStyles.eyeIcon}
                >
                  <Ionicons 
                    name={isConfirmPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color={colors.primary} 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={globalStyles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>
            
            {/* Términos y condiciones */}
            <TouchableOpacity 
              style={styles.checkboxContainer} 
              onPress={() => setTermsAccepted(!isTermsAccepted)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]}>
                {isTermsAccepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.termsText}>
                Acepto los <Text style={styles.termsLink} onPress={() => Alert.alert('Términos y Condiciones', 'Aquí irían los términos y condiciones de la aplicación.')}>términos y condiciones</Text>.
              </Text>
            </TouchableOpacity>
            {errors.terms && <Text style={globalStyles.errorText}>{errors.terms}</Text>}

            {/* Botón de registro */}
            <TouchableOpacity
              style={[globalStyles.modernButton, isSubmitting && globalStyles.disabledButton]}
              onPress={handleRegister}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityLabel="Registrarse"
              testID="registerButton"
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={globalStyles.buttonText}>Registrarse</Text>
                </>
              )}
            </TouchableOpacity>
            
            {/* Link a inicio de sesión */}
            <TouchableOpacity 
              onPress={() => navigation.navigate(ROUTES.SIGN_IN)} 
              style={styles.linkContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>¿Ya tienes una cuenta? Inicia Sesión</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ImageBackground>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageStyle: {
    opacity: 0.1,
    resizeMode: 'cover',
  },
  content: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  title: {
    fontSize: 34, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10, 
    marginTop: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 20, 
    color: '#A3B8E8',
    marginBottom: 30, 
    textAlign: 'center',
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
    fontSize: 18, 
    color: '#FFFFFF',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  usernameContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  infoButton: {
    backgroundColor: '#1D2B5F',
    paddingHorizontal: 15,
    paddingVertical: 14,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  infoBox: {
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  infoText: {
    color: '#A3B8E8',
    fontSize: 14,
    marginBottom: 3,
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    fontSize: 18, 
    color: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#1ADDDB',
    borderRadius: 4,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1ADDDB',
  },
  termsText: {
    color: '#A3B8E8',
    fontSize: 16,
  },
  termsLink: {
    color: '#1ADDDB',
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18, 
    borderRadius: 25, 
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 16, 
    paddingHorizontal: 50,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    maxWidth: 300,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20, 
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.5)',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    fontSize: 16, 
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  loadingIndicator: {
    transform: [{ scale: 1.5 }],
  },
});

export default RegisterScreen;