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

const RegisterScreen = ({ navigation }) => {
  // Referencias para animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [formData, setFormData] = useState({
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
      } else if (value.length < 6) {
        updatedErrors.password = 'La contraseña debe tener al menos 6 caracteres';
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
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
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
      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setIsLoading(true);
      setErrors({});

      console.log('Intentando registrar usuario...');

      const userData = {
        email: formData.email.toLowerCase().trim(),
        username: formData.username.toLowerCase().trim(),
        password: formData.password,
        name: formData.username
      };

      console.log('Enviando datos de registro:', {
        ...userData,
        password: '***HIDDEN***'
      });

      // Usar api.post en lugar de userService
      const response = await api.post(ENDPOINTS.REGISTER, userData);
      console.log('Respuesta del registro:', response);

      if (response.token) {
        await AsyncStorage.setItem('userToken', response.token);
        
        // Navegar al dashboard
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.DASHBOARD }],
        });
      } else {
        // Si no hay token, intentar login
        console.log('Intentando login después del registro...');
        const loginResponse = await api.post(ENDPOINTS.LOGIN, {
          email: userData.email,
          password: userData.password
        });

        if (loginResponse.token) {
          await AsyncStorage.setItem('userToken', loginResponse.token);
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.DASHBOARD }],
          });
        } else {
          throw new Error('No se pudo iniciar sesión después del registro');
        }
      }
    } catch (error) {
      console.error('Error en registro:', error);
      
      let errorMessage = 'Error al registrar usuario';
      
      if (error.message.includes('Network Error') || error.message.includes('conectar')) {
        errorMessage = 'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet.';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(
        'Error en el registro',
        errorMessage,
        [{ text: 'OK' }]
      );

      setErrors({ general: errorMessage });
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

            {/* Campo de Username */}
            <View style={styles.inputWrapper}>
              <View style={styles.usernameContainer}>
                <TextInput 
                  style={[
                    styles.input, 
                    errors.username && styles.inputError,
                    { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0 }
                  ]} 
                  placeholder="Nombre de usuario" 
                  placeholderTextColor="#A3B8E8"
                  autoCapitalize="none"
                  onChangeText={(text) => handleInputChange('username', text)} 
                  value={formData.username} 
                />
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={() => setShowInfo(!showInfo)}
                >
                  <Ionicons name="information-circle-outline" size={24} color="#A3B8E8" />
                </TouchableOpacity>
              </View>
              {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
              
              {showInfo && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    • Tu nombre de usuario es único y se usará para generar tu identidad digital
                  </Text>
                  <Text style={styles.infoText}>
                    • Solo letras minúsculas, números y guiones bajos (_)
                  </Text>
                  <Text style={styles.infoText}>
                    • Entre 3 y 20 caracteres
                  </Text>
                  <Text style={styles.infoText}>
                    • No podrás cambiarlo después
                  </Text>
                </View>
              )}
            </View>

            {/* Campo de Correo */}
            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.email && styles.inputError]} 
                placeholder="Correo Electrónico" 
                placeholderTextColor="#A3B8E8"
                keyboardType="email-address" 
                autoCapitalize="none"
                onChangeText={(text) => handleInputChange('email', text)} 
                value={formData.email} 
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            {/* Campo de Contraseña */}
            <View style={styles.inputWrapper}>
              <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
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
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
            
            {/* Confirmación de Contraseña */}
            <View style={styles.inputWrapper}>
              <View style={[styles.passwordContainer, errors.confirmPassword && styles.inputError]}>
                <TextInput 
                  style={styles.passwordInput} 
                  placeholder="Confirma tu Contraseña" 
                  placeholderTextColor="#A3B8E8"
                  secureTextEntry={!isConfirmPasswordVisible}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)} 
                  value={formData.confirmPassword} 
                />
                <TouchableOpacity 
                  onPress={() => setConfirmPasswordVisible(!isConfirmPasswordVisible)}
                  style={styles.eyeIcon}
                >
                  <Ionicons 
                    name={isConfirmPasswordVisible ? "eye-off" : "eye"} 
                    size={24} 
                    color="#A3B8E8" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
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
            {errors.terms && <Text style={styles.errorText}>{errors.terms}</Text>}

            {/* Botón de registro */}
            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
              <TouchableOpacity 
                style={[styles.button, isSubmitting && styles.disabledButton]} 
                onPress={handleRegister} 
                disabled={isSubmitting}
                activeOpacity={0.7}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Registrarse</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            
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