import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, StatusBar, ImageBackground, TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    setFormData((prevData) => ({ ...prevData, [field]: value }));
  };

  const calculateProgress = () => {
    const totalFields = Object.keys(formData).length;
    const completedFields = Object.values(formData).filter(Boolean).length;
    return (completedFields / totalFields) * 100;
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

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={require('../images/back.png')} style={styles.background} imageStyle={styles.imageStyle}>

        <View style={styles.content}>
          <Text style={styles.title}>Crear Cuenta</Text>
          <Text style={styles.subtitle}>Por favor, llena los campos para registrarte.</Text>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${calculateProgress()}%` }]} />
          </View>

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
            <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)}>
              <Text style={styles.toggleText}>{isPasswordVisible ? 'Ocultar' : 'Mostrar'}</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput 
            style={styles.passwordInput} 
            placeholder="Confirma tu Contraseña" 
            placeholderTextColor="#A3B8E8"
            secureTextEntry 
            onChangeText={(text) => handleInputChange('confirmPassword', text)} 
            value={formData.confirmPassword} 
          />
          
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setTermsAccepted(!isTermsAccepted)}>
            <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]} />
            <Text style={styles.termsText}>Acepto los <Text style={styles.termsLink}>términos y condiciones</Text>.</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, isSubmitting && styles.disabledButton]} 
            onPress={handleSignUp} 
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buttonText}>Registrarse</Text>}
          </TouchableOpacity>
          
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
    paddingHorizontal: 20,
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
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 34, 
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 50, 
  },
  subtitle: {
    fontSize: 20, 
    color: '#A3B8E8',
    marginBottom: 40, 
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#A3B8E8',
    borderRadius: 5,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    borderRadius: 5,
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
    
  },
  toggleText: {
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    backgroundColor: '#1D2B5F',
    borderRadius: 10,
    padding: 14,
    fontSize: 18, 
    color: '#FFFFFF',
    marginBottom: 20, 
  },
  button: {
    backgroundColor: 'rgba(26, 221, 219, 0.9)',
    paddingVertical: 18, 
    borderRadius: 30, 
    width: '100%',
    alignItems: 'center',
    marginBottom: 16, 
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
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
