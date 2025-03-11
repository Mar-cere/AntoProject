import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, ImageBackground, 
  TouchableOpacity, Alert, ActivityIndicator, Animated, Dimensions
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
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

const RegisterScreen = ({ navigation }) => {
  // Estados para el formulario
  const [formData, setFormData] = useState({
    name: '',
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

  // Animaciones
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

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

  // Validación de email
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Manejo de cambios en los inputs
  const handleInputChange = useCallback((field, value) => {
    setFormData((prevData) => ({ ...prevData, [field]: value }));

    // Validación en tiempo real
    const newErrors = { ...errors };
    
    if (field === 'name') {
      if (!value.trim()) {
        newErrors.name = 'El nombre es obligatorio';
      } else {
        newErrors.name = null;
      }
    }
    
    if (field === 'email') {
      if (!value.trim()) {
        newErrors.email = 'El correo es obligatorio';
      } else if (!validateEmail(value)) {
        newErrors.email = 'Correo no válido';
      } else {
        newErrors.email = null;
      }
    }

    if (field === 'password') {
      if (!value) {
        newErrors.password = 'La contraseña es obligatoria';
      } else if (value.length < 6) {
        newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      } else {
        newErrors.password = null;
      }
      
      // También validamos confirmPassword si ya tiene valor
      if (formData.confirmPassword) {
        if (value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          newErrors.confirmPassword = null;
        }
      }
    }

    if (field === 'confirmPassword') {
      if (!value) {
        newErrors.confirmPassword = 'Debes confirmar la contraseña';
      } else if (value !== formData.password) {
        newErrors.confirmPassword = 'Las contraseñas no coinciden';
      } else {
        newErrors.confirmPassword = null;
      }
    }

    setErrors(newErrors);
  }, [formData, errors]);

  // Validación completa del formulario
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
      isValid = false;
    }

    if (!formData.email.trim()) {
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

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Debes confirmar la contraseña';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
      isValid = false;
    }

    if (!isTermsAccepted) {
      newErrors.terms = 'Debes aceptar los términos y condiciones';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [formData, isTermsAccepted]);

  // Manejo del registro
  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: formData.name, 
          email: formData.email, 
          password: formData.password 
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 409) {
          Alert.alert('Error', 'Este correo ya está registrado');
        } else {
          throw new Error(data.message || 'Error en el registro');
        }
        return;
      }
      
      Alert.alert(
        'Registro exitoso', 
        '¡Tu cuenta ha sido creada! Ahora puedes iniciar sesión.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Ocurrió un error durante el registro');
      console.error('Error de registro:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animaciones para los botones
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

  const handlePressOut = useCallback(() => {
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
    ]).start();
  }, [buttonScale, buttonOpacity]);

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#030A24" />
        <ActivityIndicator size="large" color="#1ADDDB" style={styles.loadingIndicator} />
      </View>
    );
  }

  return (
    <KeyboardAwareScrollView 
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#030A24" />
      <ImageBackground 
        source={require('../images/back.png')} 
        style={styles.background} 
        imageStyle={styles.imageStyle}
      >
        <ParticleBackground />
        
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

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.name ? styles.inputError : null]} 
                placeholder="Nombre" 
                placeholderTextColor="#A3B8E8"
                onChangeText={(text) => handleInputChange('name', text)} 
                value={formData.name}
                autoCapitalize="words"
              />
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <TextInput 
                style={[styles.input, errors.email ? styles.inputError : null]} 
                placeholder="Correo electrónico" 
                placeholderTextColor="#A3B8E8"
                keyboardType="email-address"
                autoCapitalize="none"
                onChangeText={(text) => handleInputChange('email', text)} 
                value={formData.email} 
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
                  style={styles.eyeIcon}
                  onPress={() => setPasswordVisible(!isPasswordVisible)}
                >
                  <Ionicons 
                    name={isPasswordVisible ? 'eye-off' : 'eye'} 
                    size={24} 
                    color="#1ADDDB" 
                  />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
            
            <View style={styles.inputWrapper}>
              <View style={[styles.passwordContainer, errors.confirmPassword ? styles.inputError : null]}>
                <TextInput 
                  style={styles.passwordInput} 
                  placeholder="Confirma tu contraseña" 
                  placeholderTextColor="#A3B8E8"
                  secureTextEntry={!isConfirmPasswordVisible} 
                  onChangeText={(text) => handleInputChange('confirmPassword', text)} 
                  value={formData.confirmPassword} 
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setConfirmPasswordVisible(!isConfirmPasswordVisible)}
                >
                  <Ionicons 
                    name={isConfirmPasswordVisible ? 'eye-off' : 'eye'} 
                    size={24} 
                    color="#1ADDDB" 
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setTermsAccepted(!isTermsAccepted)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]}>
              {isTermsAccepted && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.termsText}>
              Acepto los <Text style={styles.termsLink} onPress={() => Alert.alert('Términos', 'Aquí irían los términos y condiciones')}>términos y condiciones</Text>
            </Text>
          </TouchableOpacity>
          {errors.terms && <Text style={[styles.errorText, { alignSelf: 'center', marginBottom: 15 }]}>{errors.terms}</Text>}

          <View style={styles.buttonContainer}>
            <Animated.View 
              style={{ 
                transform: [{ scale: buttonScale }],
                opacity: buttonOpacity,
                width: '100%',
              }}
            >
              <TouchableOpacity 
                style={[styles.mainButton, isSubmitting && styles.disabledButton]} 
                onPress={handleSignUp} 
                disabled={isSubmitting}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.mainButtonText}>Registrarse</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity 
              onPress={() => navigation.navigate('SignIn')} 
              style={styles.linkContainer}
              activeOpacity={0.7}
            >
              <Text style={styles.linkText}>¿Ya tienes una cuenta? Inicia Sesión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ImageBackground>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  },
  loadingIndicator: {
    transform: [{ scale: 1.5 }],
  },
  content: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },
  title: {
    fontSize: 34, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18, 
    color: '#A3B8E8',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 10,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    alignSelf: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#A3B8E8',
    marginRight: 10,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1ADDDB',
    borderColor: '#1ADDDB',
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
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
  },
  mainButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18,
    paddingHorizontal: 60,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
    width: '100%',
    maxWidth: 300,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: 'rgba(26, 221, 219, 0.5)',
  },
  linkContainer: {
    marginTop: 10,
  },
  linkText: {
    fontSize: 16, 
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
});

export default RegisterScreen;