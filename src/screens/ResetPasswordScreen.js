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

const ResetPasswordScreen = ({ navigation }) => {
  // Referencias para animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Validación de email
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

  // Manejo del restablecimiento de contraseña
  const handleResetPassword = async () => {
    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();
    
    // Validar email
    if (!normalizedEmail) {
      setError('Por favor, introduce tu correo electrónico');
      return;
    }

    if (!validateEmail(normalizedEmail)) {
      setError('Por favor, introduce un correo electrónico válido');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await userService.recoverPassword(normalizedEmail);
      setSuccess(true);
    } catch (error) {
      setError(handleApiError(error) || 'Error al enviar el correo de recuperación');
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
            <Text style={styles.title}>Restablecer Contraseña</Text>
            
            {success ? (
              <>
                <View style={styles.successContainer}>
                  <Ionicons name="checkmark-circle" size={60} color="#1ADDDB" />
                  <Text style={styles.successText}>
                    Hemos enviado un correo con instrucciones para restablecer tu contraseña.
                  </Text>
                  <Text style={styles.instructionText}>
                    Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
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
                    <Text style={styles.buttonText}>Volver al Inicio de Sesión</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Introduce tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.
                </Text>

                <View style={styles.inputWrapper}>
                  <TextInput 
                    style={[styles.input, error && styles.inputError]} 
                    placeholder="Correo Electrónico" 
                    placeholderTextColor="#A3B8E8"
                    keyboardType="email-address" 
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text.toLowerCase().trim());
                      setError('');
                    }}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
                      <Text style={styles.buttonText}>Enviar Instrucciones</Text>
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
    marginBottom: 25,
  },
  input: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    paddingVertical: 15,
    fontSize: 18, 
    color: '#FFFFFF',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
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

export default ResetPasswordScreen; 