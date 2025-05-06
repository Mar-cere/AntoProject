import React, { useState, useEffect, useCallback } from 'react';
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
  SafeAreaView,
  Animated,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [formData, setFormData] = useState({
    avatar: null,
    name: '',
    username: '',
    email: '',
    notifications: true,
    theme: 'light'
  });
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [errors, setErrors] = useState({});
  const [fadeAnim] = useState(new Animated.Value(0));

  const { checkSession } = useSession();

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await checkSession();
      
      if (!token) {
        return;
      }

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al obtener datos del usuario');
      }

      const userData = await response.json();
      
      setFormData({
        avatar: userData.avatar || null,
        name: userData.name || '',
        username: userData.username || '',
        email: userData.email || '',
        notifications: userData.preferences?.notifications ?? true,
        theme: userData.preferences?.theme || 'light'
      });

      if (userData.avatar) {
        const url = await fetchAvatarUrl(userData.avatar, token);
        setAvatarUrl(url);
      } else {
        setAvatarUrl(null);
      }

    } catch (error) {
      console.error('Error al cargar datos:', error);
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatarUrl = async (publicId, token) => {
    const res = await fetch(`${API_URL}/api/users/avatar-url/${publicId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    return data.url;
  };

  const handleError = (error) => {
    console.error('Error:', error);
    
    let errorMessage = 'Ha ocurrido un error';
    
    if (error.message.includes('network')) {
      errorMessage = 'Error de conexión. Por favor, verifica tu internet.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'La solicitud ha tardado demasiado. Intenta de nuevo.';
    }

    Alert.alert(
      'Error',
      errorMessage,
      [
        { 
          text: 'Reintentar', 
          onPress: () => loadUserData() 
        },
        { 
          text: 'OK',
          style: 'cancel'
        }
      ]
    );
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.name && formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.email) {
      newErrors.email = 'El correo es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Correo inválido';
    }

    if (Object.keys(newErrors).length > 0) {
      Alert.alert(
        'Errores de validación',
        Object.values(newErrors).join('\n'),
        [{ text: 'OK' }]
      );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = await checkSession();
      
      if (!token) {
        throw new Error('No se encontró la sesión del usuario');
      }

      const response = await fetch(`${API_URL}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          avatar: formData.avatar,
          name: formData.name.trim(),
          email: formData.email.trim(),
          preferences: {
            notifications: formData.notifications,
            theme: formData.theme
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al actualizar el perfil');
      }

      const updatedUser = await response.json();
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      
      if (updatedUser.avatar) {
        const url = await fetchAvatarUrl(updatedUser.avatar, token);
        setAvatarUrl(url);
      } else {
        setAvatarUrl(null);
      }

      Alert.alert(
        'Éxito',
        'Perfil actualizado correctamente',
        [{ text: 'OK', onPress: () => setEditing(false) }]
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setHasChanges(false);
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error al guardar:', error);
      handleError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      setHasChanges(true);
      return newData;
    });
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasChanges) return;

      e.preventDefault();
      Alert.alert(
        'Cambios sin guardar',
        '¿Deseas descartar los cambios?',
        [
          { text: 'Cancelar', style: 'cancel', onPress: () => {} },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [hasChanges, navigation]);

  const handleToggleNotifications = useCallback(() => {
    if (!editing) return;
    handleFormChange('notifications', !formData.notifications);
  }, [editing, formData.notifications]);

  const handleToggleTheme = useCallback(() => {
    if (!editing) return;
    handleFormChange('theme', formData.theme === 'light' ? 'dark' : 'light');
  }, [editing, formData.theme]);

  const handleAvatarChange = async () => {
    if (!editing) return;
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar la foto de perfil.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const publicId = await uploadImageToCloudinary(result.assets[0].uri);
      setFormData(prev => ({
        ...prev,
        avatar: publicId
      }));
      const token = await checkSession();
      const url = await fetchAvatarUrl(publicId, token);
      setAvatarUrl(url);
      setHasChanges(true);
    }
  };

  const uploadImageToCloudinary = async (imageUri) => {
    const data = new FormData();
    data.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    });
    data.append('upload_preset', 'Anto Avatar'); // Debe ser de tipo 'authenticated'
    data.append('type', 'authenticated'); // Hace la imagen privada

    const res = await fetch('https://api.cloudinary.com/v1_1/dfmmn3hqw/image/upload', {
      method: 'POST',
      body: data,
    });
    const file = await res.json();
    if (!file.public_id) {
      throw new Error('No se pudo subir la imagen. Intenta nuevamente.');
    }
    return file.public_id; // Guarda el public_id, no la URL
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

        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.profileHeader}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarChange}
              disabled={!editing}
              activeOpacity={editing ? 0.7 : 1}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <MaterialCommunityIcons name="account-circle" size={80} color="#1ADDDB" />
              )}
              {editing && (
                <View style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  backgroundColor: '#1ADDDB',
                  borderRadius: 12,
                  padding: 4,
                }}>
                  <MaterialCommunityIcons name="camera" size={20} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.profileName}>{formData.name || ""}</Text>
            <Text style={styles.profileUsername}>@{formData.username}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Personal</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={[
                  styles.input,
                  !editing && styles.inputDisabled
                ]}
                value={formData.name}
                onChangeText={(text) => handleFormChange('name', text)}
                editable={editing}
                placeholder="Agregar nombre"
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
              <View style={styles.inputWrapper}>
                <MaterialCommunityIcons name="email" size={20} color="#A3B8E8" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={formData.email}
                  onChangeText={(text) => handleFormChange('email', text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={editing}
                  placeholder="Correo electrónico"
                  placeholderTextColor="#A3B8E8"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
            
            <TouchableOpacity 
              style={styles.optionButton}
              onPress={handleToggleNotifications}
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
              onPress={handleToggleTheme}
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
        </Animated.View>

        {saveSuccess && (
          <View style={styles.saveSuccessIndicator}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={styles.saveSuccessText}>Guardado</Text>
          </View>
        )}
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
  saveSuccessIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    position: 'absolute',
    top: 60,
    right: 16,
  },
  saveSuccessText: {
    color: '#4CAF50',
    marginLeft: 4,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#1ADDDB',
    borderWidth: 2,
  },
  headerButtonWithBadge: {
    position: 'relative',
  },
  changesBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1ADDDB',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2B5F',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(26, 221, 219, 0.1)',
  },
});

const useSession = () => {
  const checkSession = useCallback(async () => {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert('Sesión Expirada', 'Por favor, inicia sesión nuevamente');
      navigation.replace('Login');
      return null;
    }
    return token;
  }, []);

  return { checkSession };
};

export default EditProfileScreen;
