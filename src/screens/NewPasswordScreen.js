import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, 
  ImageBackground, TouchableOpacity, Alert, 
  ActivityIndicator, Animated 
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import userService, { ROUTES, handleApiError } from '../../backend/routes/userRoutes';

const NewPasswordScreen = ({ navigation, route }) => {
  // Referencias para animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  // Extraer el token y email de los parámetros de la ruta
  const { token, email } = route.params || {};

  // Estados
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [success, setSuccess] = useState(false);

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

  // Validación de contraseña y confirmación
  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    
    let updatedErrors = { ...errors };

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

  // Validación del formulario completo
  const validateForm = () => {
    const newErrors = {};
    
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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejo del cambio de contraseña
  const handleResetPassword = async () => {
    if (!validateForm()) {
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        Alert.alert('Error de validación', errors[errorKeys[0]]);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // Implementar método para establecer nueva contraseña
      await userService.setNewPassword(token, email, formData.password);
      setSuccess(true);
    } catch (error) {
      Alert.alert('Error', handleApiError(error) || 'Error al cambiar la contraseña');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground 
        source={require('../images/back.png')} 
        style={styles.background} 
        imageStyle={styles.imageStyle}
      >
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
            <Text style={styles.title}>Nueva Contraseña</Text>
            
            {success ? (
              <>
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#1ADDDB" />
                  <Text style={styles.successText}>
                    ¡Tu contraseña ha sido cambiada exitosamente!
                  </Text>
                  <Text style={styles.instructionText}>
                    Ahora puedes iniciar sesión con tu nueva contraseña.
                  </Text>
                </View>
                
                <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={() => navigation.navigate(ROUTES.SIGN_IN)}
                    activeOpacity={0.7}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    <Text style={styles.buttonText}>Ir a Iniciar Sesión</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Crea una nueva contraseña segura para tu cuenta.
                </Text>

                {/* Campo de Contraseña */}
                <View style={styles.inputWrapper}>
                  <View style={[styles.passwordContainer, errors.password && styles.inputError]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Nueva contraseña"
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
                      placeholder="Confirma tu nueva contraseña" 
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

                <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
                  <TouchableOpacity 
                    style={[styles.button, isSubmitting && styles.disabledButton]} 
                    onPress={handleResetPassword} 
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>Cambiar Contraseña</Text>
                    )}
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity 
                  onPress={() => navigation.navigate(ROUTES.SIGN_IN)} 
                  style={styles.linkContainer}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>Volver al Inicio de Sesión</Text>
                </TouchableOpacity>
              </>
            )}
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
    marginBottom: 20, 
    marginTop: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18, 
    color: '#A3B8E8',
    marginBottom: 30, 
    textAlign: 'center',
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 20,
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
    paddingVertical: 15,
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
    marginTop: 8,
    marginLeft: 5,
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
    fontSize: 18, 
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
  successContainer: {
    alignItems: 'center',
    padding: 20,
    marginVertical: 30,
    marginHorizontal: 10,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.3)',
  },
  successText: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 16,
    color: '#A3B8E8',
    textAlign: 'center',
  },
});

export default NewPasswordScreen; 