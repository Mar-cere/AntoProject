import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator 
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
      return;
    }
    if (!validateEmail(email)) {
      Alert.alert('Error', 'Introduce un correo válido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5001/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al iniciar sesión.');
      Alert.alert('Éxito', 'Inicio de sesión exitoso.');
      navigation.navigate('Dash');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      <Text style={styles.subtitle}>Introduce tus credenciales para acceder.</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Correo Electrónico"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />
      
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Contraseña"
          secureTextEntry={!isPasswordVisible}
          onChangeText={setPassword}
          value={password}
        />
        <TouchableOpacity onPress={() => setPasswordVisible(!isPasswordVisible)}>
          <Text style={styles.toggleText}>{isPasswordVisible ? 'Ocultar' : 'Mostrar'}</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={[styles.button, isSubmitting && styles.disabledButton]} onPress={handleSignIn} disabled={isSubmitting}>
        {isSubmitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.buttonText}>Ingresar</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkContainer}>
        <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
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
  input: {
    width: '100%',
    backgroundColor: '#CECFDB',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#0E1A57',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CECFDB',
    borderRadius: 20,
    paddingHorizontal: 15,
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: '#0E1A57',
  },
  toggleText: {
    color: '#1ADDDB',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#5127DB',
    paddingVertical: 12,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: '#7F8C8D',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 20,
  },
  linkText: {
    fontSize: 16,
    color: '#1ADDDB',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SignInScreen;
