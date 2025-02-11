import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Animated
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
  const progressAnim = useRef(new Animated.Value(0)).current;

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInputChange = (field, value) => {
    setFormData((prevData) => ({ ...prevData, [field]: value }));
  };

  const calculateProgress = () => {
    const totalFields = Object.keys(formData).length;
    const completedFields = Object.values(formData).filter(Boolean).length;
    return (completedFields / totalFields) * 100;
  };

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: calculateProgress(),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [formData]);

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
      const response = await fetch('http://localhost:5001/api/users/register', {
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
      <Text style={styles.title}>Crear Cuenta</Text>
      <Text style={styles.subtitle}>Por favor, llena los campos para registrarte.</Text>
      
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, { width: `${progressAnim.__getValue()}%` }]} />
      </View>

      <TextInput style={styles.input} placeholder="Nombre" onChangeText={(text) => handleInputChange('name', text)} value={formData.name} />
      <TextInput style={styles.input} placeholder="Correo Electrónico" keyboardType="email-address" onChangeText={(text) => handleInputChange('email', text)} value={formData.email} />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña"
          secureTextEntry={!isPasswordVisible}
          onChangeText={(text) => handleInputChange('password', text)}
          value={formData.password}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)}>
          <Text style={styles.toggleText}>{isPasswordVisible ? 'Ocultar' : 'Mostrar'}</Text>
        </TouchableOpacity>
      </View>
      
      <TextInput style={styles.input} placeholder="Confirma tu Contraseña" secureTextEntry onChangeText={(text) => handleInputChange('confirmPassword', text)} value={formData.confirmPassword} />
      
      <TouchableOpacity style={styles.checkboxContainer} onPress={() => setTermsAccepted(!isTermsAccepted)}>
        <View style={[styles.checkbox, isTermsAccepted && styles.checkboxChecked]} />
        <Text style={styles.termsText}>Acepto los <Text style={styles.termsLink}>términos y condiciones</Text>.</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, isSubmitting && styles.disabledButton]} onPress={handleSignUp} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buttonText}>Registrarse</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('SignIn')} style={styles.linkContainer}>
        <Text style={styles.linkText}>¿Ya tienes una cuenta? Inicia Sesión</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0E1A57',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#A3ADDB',
    marginBottom: 20,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#A3ADDB',
    borderRadius: 5,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#5127DB',
    borderRadius: 5,
  },
  input: {
    width: '100%',
    backgroundColor: '#CECFDB',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#1D1B70',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CECFDB',
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#0E1A57',
  },
  button: {
    backgroundColor: '#5127DB',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;