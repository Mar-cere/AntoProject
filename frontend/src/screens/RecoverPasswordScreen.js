import React, { useState, useRef, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, 
  ImageBackground, TouchableOpacity, Alert, 
  ActivityIndicator, Animated 
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import ParticleBackground from '../components/ParticleBackground';
import { userService } from '../services/userService';
import { ROUTES } from '../../constants/routes';
import { handleApiError } from '../config/api';
import { globalStyles, colors } from '../styles/globalStyles';

const RecoverPasswordScreen = ({ navigation }) => {
  // Referencias para animaciones
  const buttonScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;

  // Estados
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
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
  const handleRecoverPassword = async () => {
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
      const response = await userService.recoverPassword(normalizedEmail);
      // Navegar a la pantalla de verificación de código
      navigation.navigate('VerifyCode', { email: normalizedEmail });
    } catch (error) {
      setError(handleApiError(error) || 'Error al enviar el código de recuperación');
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
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>

            <Text style={styles.title}>Recuperar Contraseña</Text>
            
            <Text style={styles.subtitle}>
              Introduce tu correo electrónico y te enviaremos un código de verificación para recuperar tu contraseña.
            </Text>

            <View style={globalStyles.inputWrapper}>
              <View style={[
                globalStyles.inputContainer, 
                error && globalStyles.inputError
              ]}>
                <Ionicons name="mail-outline" size={20} color={colors.primary} style={globalStyles.inputIcon} />
                <TextInput 
                  style={globalStyles.input}
                  placeholder="Correo Electrónico" 
                  placeholderTextColor={colors.accent}
                  keyboardType="email-address" 
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text.toLowerCase().trim());
                    setError('');
                  }}
                  accessibilityLabel="Correo Electrónico"
                  testID="recoverEmailInput"
                />
              </View>
              {error ? <Text style={globalStyles.errorText}>{error}</Text> : null}
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }], width: '100%' }}>
              <TouchableOpacity 
                style={[globalStyles.modernButton, isSubmitting && globalStyles.disabledButton]} 
                onPress={handleRecoverPassword} 
                disabled={isSubmitting}
                activeOpacity={0.7}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                accessibilityLabel="Enviar Código"
                testID="sendCodeButton"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={globalStyles.buttonText}>Enviar Código</Text>
                  </>
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
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
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

export default RecoverPasswordScreen; 