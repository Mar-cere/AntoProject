import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, ImageBackground, TouchableOpacity, Alert, ActivityIndicator, Animated
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'https://antobackend.onrender.com';

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isTermsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});

  const buttonScale = new Animated.Value(1);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    setFormData((prevData) => ({ ...prevData, [field]: value }));

    // Validación en tiempo real
    if (field === 'email' && !validateEmail(value)) {
      setErrors((prevErrors) => ({ ...prevErrors, email: 'Correo no válido' }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, email: null }));
    }

    if (field === 'password' && value.length < 6) {
      setErrors((prevErrors) => ({ ...prevErrors, password: 'La contraseña debe tener al menos 6 caracteres' }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, password: null }));
    }

    if (field === 'confirmPassword' && value !== formData.password) {
      setErrors((prevErrors) => ({ ...prevErrors, confirmPassword: 'Las contraseñas no coinciden' }));
    } else {
      setErrors((prevErrors) => ({ ...prevErrors, confirmPassword: null }));
    }
  };

  const handleSignUp = async () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Introduce un correo válido.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }
    if (!isTermsAccepted) {
      Alert.alert('Error', 'Debes aceptar los términos y condiciones.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error en el registro.');
      Alert.alert('Éxito', '¡Cuenta creada exitosamente!');
      navigation.navigate('SignIn');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>

        <View style={styles.content}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Por favor, llena los campos para registrarte.</Text>

          <TextInput 
            style={styles.input} 
            placeholder="Nombre" 
            placeholderTextColor="#A3B8E8"
            onChangeText={(text) => handleInputChange('name', text)} 
            value={formData.name} 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Correo Electrónico" 
            placeholderTextColor="#A3B8E8"
            keyboardType="email-address" 
            onChangeText={(text) => handleInputChange('email', text)} 
            value={formData.email} 
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Campo de Contraseña y Confirmación de Contraseña */}
          <View style={styles.passwordContainer}>
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
          
          <View style={styles.passwordContainer}>
            <TextInput 
              style={styles.passwordInput} 
              placeholder="Confirma tu Contraseña" 
              placeholderTextColor="#A3B8E8"
              secureTextEntry 
              onChangeText={(text) => handleInputChange('confirmPassword', text)} 
              value={formData.confirmPassword} 
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
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
          
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setTermsAccepted(!isTermsAccepted)}>
            <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]} />
            <Text style={styles.termsText}>Acepto los <Text style={styles.termsLink}>términos y condiciones</Text>.</Text>
          </TouchableOpacity>

          {/* Añadir feedback visual a los botones */}
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity 
              style={[styles.button, isSubmitting && styles.disabledButton]} 
              onPress={handleSignUp} 
              disabled={isSubmitting}
              activeOpacity={0.7} // Cambia la opacidad al presionar
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
            >
              {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buttonText}>Registrarse</Text>}
            </TouchableOpacity>
          </Animated.View>
          
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.linkContainer}>
            <Text style={styles.linkText}>¿Ya tienes una cuenta? Inicia Sesión</Text>
          </TouchableOpacity>
        </View>

      </ImageBackground>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0, // Asegúrate de que no haya padding horizontal
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center', // Asegura que el contenido esté centrado
    alignItems: 'center',
  },
  imageStyle: {
    opacity: 0.1,
    resizeMode: 'cover', // Asegúrate de que la imagen cubra todo el espacio
  },
  content: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 34, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 50, 
    marginTop:80,
  },
  subtitle: {
    fontSize: 20, 
    color: '#A3B8E8',
    marginBottom: 40, 
  },
  passwordContainer: {
    width: '100%',
    marginBottom: 20, 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    fontSize: 18, 
    color: '#FFFFFF',
    paddingVertical: 14,
    backgroundColor: '#1D2B5F',
    width: '100%',
    paddingHorizontal: 10,
  },
  toggleText: {
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    paddingVertical: 14,
    fontSize: 18, 
    color: '#FFFFFF',
    marginBottom: 20, 
    paddingHorizontal: 10,
    width: '100%',
  },
  button: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18, 
    borderRadius: 30, 
    width: '100%',
    alignItems: 'center',
    marginBottom: 16, 
    paddingHorizontal: 50,
    shadowColor: '#1ADDDB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 20, 
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    fontSize: 16, 
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#A3B8E8',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#1ADDDB',
  },
  termsText: {
    color: '#A3B8E8',
  },
  termsLink: {
    color: '#1ADDDB',
    textDecorationLine: 'underline',
  },
  disabledButton: {
    backgroundColor: '#A3B8E8',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
});

export default RegisterScreen;