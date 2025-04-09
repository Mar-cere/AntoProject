import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  ImageBackground,
  SafeAreaView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    notifications: true,
    theme: 'light'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Primero intentamos obtener el token
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert('Error', 'No se encontró la sesión del usuario');
        return;
      }

      // Hacemos la petición al backend
      const response = await fetch('http://tu-api.com/api/users/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Error al obtener datos del usuario');
      }

      const userData = await response.json();
      
      // Actualizamos el estado con los datos del usuario
      setFormData({
        name: userData.name || '',
        username: userData.username || '',
        email: userData.email || '',
        notifications: userData.preferences?.notifications ?? true,
        theme: userData.preferences?.theme || 'light'
      });

    } catch (error) {
      console.error('Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        throw new Error('No se encontró la sesión del usuario');
      }

      const response = await fetch('http://tu-api.com/api/users/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          preferences: {
            notifications: formData.notifications,
            theme: formData.theme
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al actualizar el perfil');
      }

      const updatedUser = await response.json();
      
      // Actualizamos el almacenamiento local
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      Alert.alert(
        'Éxito',
        'Perfil actualizado correctamente',
        [{ text: 'OK', onPress: () => {
          setEditing(false);
        }}]
      );
    } catch (error) {
      console.error('Error al guardar:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1ADDDB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../images/back.png')}
        style={styles.background}
        imageStyle={styles.imageStyle}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          {editing ? (
            <TouchableOpacity 
              style={[styles.headerButton, saving && styles.disabledButton]}
              onPress={handleSave}
              disabled={saving}
            >
              <MaterialCommunityIcons 
                name="content-save" 
                size={24} 
                color={saving ? "#A3B8E8" : "#1ADDDB"} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setEditing(true)}
            >
              <MaterialCommunityIcons name="pencil" size={24} color="#1ADDDB" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons name="account-circle" size={80} color="#1ADDDB" />
            </View>
            <Text style={styles.profileName}>{formData.name || formData.username}</Text>
            <Text style={styles.profileUsername}>@{formData.username}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre Completo</Text>
              <TextInput
                style={[
                  styles.input,
                  !editing && styles.inputDisabled
                ]}
                value={formData.name}
                onChangeText={(text) => setFormData({...formData, name: text})}
                editable={editing}
                placeholder="Agregar nombre completo"
                placeholderTextColor="#A3B8E8"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre de Usuario</Text>
              <TextInput
                style={[styles.input, { color: '#A3B8E8' }]}
                value={formData.username}
                editable={false}
              />
              <Text style={styles.helperText}>
                El nombre de usuario no se puede cambiar
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={formData.email}
                onChangeText={(text) => setFormData({...formData, email: text})}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={editing}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => editing && setFormData({
                ...formData,
                notifications: !formData.notifications
              })}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons name="bell" size={24} color="#1ADDDB" />
                <Text style={styles.optionText}>Notificaciones</Text>
              </View>
              <View style={[
                styles.toggle,
                formData.notifications && styles.toggleActive
              ]}>
                <View style={[
                  styles.toggleCircle,
                  formData.notifications && styles.toggleCircleActive
                ]} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => editing && setFormData({
                ...formData,
                theme: formData.theme === 'light' ? 'dark' : 'light'
              })}
            >
              <View style={styles.optionLeft}>
                <MaterialCommunityIcons 
                  name={formData.theme === 'light' ? 'white-balance-sunny' : 'moon-waning-crescent'} 
                  size={24} 
                  color="#1ADDDB" 
                />
                <Text style={styles.optionText}>Tema {formData.theme === 'light' ? 'Claro' : 'Oscuro'}</Text>
              </View>
              <MaterialCommunityIcons 
                name="chevron-right" 
                size={24} 
                color="#A3B8E8" 
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030A24',
  },
  background: {
    flex: 1,
  },
  imageStyle: {
    opacity: 0.1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030A24',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(3, 10, 36, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(26, 221, 219, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#A3B8E8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1D2B5F',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: '#A3B8E8',
    fontSize: 12,
    marginTop: 4,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(29, 43, 95, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: 'rgba(26, 221, 219, 0.3)',
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A3B8E8',
  },
  toggleCircleActive: {
    backgroundColor: '#1ADDDB',
    transform: [{ translateX: 22 }],
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(26, 221, 219, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: '#A3B8E8',
    marginBottom: 16,
  },
  inputDisabled: {
    opacity: 0.7,
    backgroundColor: 'rgba(29, 43, 95, 0.5)',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default EditProfileScreen;
