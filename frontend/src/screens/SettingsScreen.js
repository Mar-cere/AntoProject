import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  Pressable,
  Image,
  Linking,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  registerForPushNotificationsAsync, 
  scheduleDailyNotification,
  cancelAllNotifications,
  checkNotificationStatus,
  sendImmediateNotification,
  scheduleMultipleDailyNotifications
} from '../utils/notifications';
import notifications from '../data/notifications';
import * as Notifications from 'expo-notifications';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../context/AuthContext';
import { updateUser } from '../services/userService';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, updateUser: updateUserContext } = useAuth();

  // Estado para las preferencias (usar siempre objetos Date)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState("Español");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [morningTime, setMorningTime] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [eveningTime, setEveningTime] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);

  // Guardar preferencias
  const savePreference = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.log("Error guardando preferencia:", e);
    }
  };

  // Manejar logout
  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await AsyncStorage.clear();
      navigation.replace('SignIn');
    } catch (e) {
      Alert.alert("Error", "No se pudo cerrar sesión");
    }
  };

  // Manejar eliminación de cuenta
  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      // Aquí iría la lógica para eliminar la cuenta
      await AsyncStorage.clear();
      navigation.replace('SignIn');
    } catch (e) {
      Alert.alert("Error", "No se pudo eliminar la cuenta");
    }
  };

  // Idiomas disponibles
  const languages = ["Español", "Inglés"];

  useEffect(() => {
    if (user?.notificationPreferences) {
      const { morning, evening } = user.notificationPreferences;
      const morningDate = new Date();
      morningDate.setHours(morning.hour, morning.minute, 0, 0);
      setMorningTime(morningDate);
      const eveningDate = new Date();
      eveningDate.setHours(evening.hour, evening.minute, 0, 0);
      setEveningTime(eveningDate);
    }
  }, [user]);

  // Sincronizar estado de notificaciones con AsyncStorage al montar
  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const value = await AsyncStorage.getItem('notifications');
        if (value !== null) {
          setNotificationsEnabled(JSON.parse(value));
        }
      } catch (e) {
        console.log('Error cargando preferencia de notificaciones:', e);
      }
    };
    loadNotificationPreference();
  }, []);

  const handleNotificationToggle = async (value) => {
    setNotificationsEnabled(value);
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(value));
    } catch (e) {
      console.log('Error guardando preferencia de notificaciones:', e);
    }
    if (value) {
      const morningDate = morningTime;
      const eveningDate = eveningTime;
      await scheduleDailyNotification(morningDate.getHours(), morningDate.getMinutes());
      await scheduleDailyNotification(eveningDate.getHours(), eveningDate.getMinutes());
    } else {
      await cancelAllNotifications();
    }
  };

  const handleTimeChange = (event, selectedTime, isMorning) => {
    if (Platform.OS === 'android') {
      setShowMorningPicker(false);
      setShowEveningPicker(false);
    }
    if (selectedTime) {
      if (isMorning) {
        setMorningTime(selectedTime);
      } else {
        setEveningTime(selectedTime);
      }
    }
  };

  const saveNotificationPreferences = async () => {
    const preferences = {
      morning: {
        hour: morningTime.getHours(),
        minute: morningTime.getMinutes()
      },
      evening: {
        hour: eveningTime.getHours(),
        minute: eveningTime.getMinutes()
      }
    };
    try {
      await updateUser(user._id, { notificationPreferences: preferences });
      updateUserContext({ ...user, notificationPreferences: preferences });
      if (notificationsEnabled) {
        await cancelAllNotifications();
        await scheduleDailyNotification(preferences.morning.hour, preferences.morning.minute);
        await scheduleDailyNotification(preferences.evening.hour, preferences.evening.minute);
      }
      Alert.alert('Éxito', 'Preferencias de notificaciones guardadas');
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar las preferencias');
    }
  };

  // Configurar notificaciones al cargar el componente
  useEffect(() => {
    configureNotifications();
  }, []);

  const configureNotifications = async () => {
    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  };

  // Función para probar notificación
  const testNotification = async () => {
    try {
      // Verificar permisos
      const { status } = await Notifications.getPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          "Permisos necesarios",
          "Necesitamos tu permiso para enviar notificaciones",
          [
            {
              text: "Cancelar",
              style: "cancel"
            },
            {
              text: "Permitir",
              onPress: async () => {
                const { status } = await Notifications.requestPermissionsAsync();
                if (status === 'granted') {
                  sendTestNotification();
                }
              }
            }
          ]
        );
        return;
      }

      sendTestNotification();
    } catch (error) {
      console.log("Error al verificar permisos:", error);
      Alert.alert("Error", "No se pudo verificar los permisos de notificación");
    }
  };

  const sendTestNotification = async () => {
    try {
      // Seleccionar una notificación aleatoria
      const randomIndex = Math.floor(Math.random() * notifications.length);
      const notification = notifications[randomIndex];

      // Enviar la notificación de prueba
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // null significa que se enviará inmediatamente
      });

      Alert.alert(
        "Notificación enviada",
        "Deberías recibir una notificación de prueba en breve",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.log("Error al enviar notificación:", error);
      Alert.alert("Error", "No se pudo enviar la notificación de prueba");
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Configuración</Text>
        </View>

        {/* Preferencias */}
        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.item}>
          <MaterialCommunityIcons name="bell" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Notificaciones</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            thumbColor={notificationsEnabled ? "#1ADDDB" : "#ccc"}
            accessibilityLabel="Activar o desactivar notificaciones"
            testID="switch-notifications"
          />
        </View>

        {notificationsEnabled && (
          <>
            <View style={styles.timeSelectorContainer}>
              <Text style={styles.timeSelectorLabel}>Hora de notificación matutina</Text>
              <TouchableOpacity 
                style={styles.timeSelectorButton}
                onPress={() => setShowMorningPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="clock-outline" size={24} color="#1ADDDB" />
                <Text style={styles.timeSelectorText}>
                  {morningTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showMorningPicker && (
                <Modal
                  transparent={true}
                  animationType="fade"
                  visible={showMorningPicker}
                  onRequestClose={() => setShowMorningPicker(false)}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: '#22335C', borderRadius: 12, padding: 16 }}>
                      <DateTimePicker
                        value={morningTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          handleTimeChange(event, date, true);
                          setShowMorningPicker(false);
                        }}
                        textColor="#FFFFFF"
                        themeVariant="dark"
                      />
                      <TouchableOpacity onPress={() => setShowMorningPicker(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
                        <Text style={{ color: '#1ADDDB', fontWeight: 'bold' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
            
            <View style={styles.timeSelectorContainer}>
              <Text style={styles.timeSelectorLabel}>Hora de notificación vespertina</Text>
              <TouchableOpacity 
                style={styles.timeSelectorButton}
                onPress={() => setShowEveningPicker(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="clock-outline" size={24} color="#1ADDDB" />
                <Text style={styles.timeSelectorText}>
                  {eveningTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showEveningPicker && (
                <Modal
                  transparent={true}
                  animationType="fade"
                  visible={showEveningPicker}
                  onRequestClose={() => setShowEveningPicker(false)}
                >
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: '#22335C', borderRadius: 12, padding: 16 }}>
                      <DateTimePicker
                        value={eveningTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          handleTimeChange(event, date, false);
                          setShowEveningPicker(false);
                        }}
                        textColor="#FFFFFF"
                        themeVariant="dark"
                      />
                      <TouchableOpacity onPress={() => setShowEveningPicker(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
                        <Text style={{ color: '#1ADDDB', fontWeight: 'bold' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={saveNotificationPreferences}
            >
              <MaterialCommunityIcons name="content-save" size={24} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Guardar preferencias</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.item}>
          <MaterialCommunityIcons name="theme-light-dark" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Tema oscuro</Text>
          <Switch
            value={darkMode}
            onValueChange={val => {
              setDarkMode(val);
              savePreference("darkMode", val);
            }}
            thumbColor={darkMode ? "#1ADDDB" : "#ccc"}
            accessibilityLabel="Activar o desactivar tema oscuro"
            testID="switch-darkmode"
          />
        </View>

        <View style={styles.item}>
          <MaterialCommunityIcons name="translate" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Idioma</Text>
          <TouchableOpacity
            onPress={() => {
              const idx = languages.indexOf(language);
              setLanguage(languages[(idx + 1) % languages.length]);
              savePreference("language", languages[(idx + 1) % languages.length]);
            }}
            accessibilityLabel="Cambiar idioma"
            testID="button-language"
          >
            <Text style={styles.languageText}>{language}</Text>
          </TouchableOpacity>
        </View>

        {/* Separador */}
        <View style={styles.separator} />

        {/* Cuenta */}
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <TouchableOpacity 
          style={styles.item} 
          onPress={() => navigation.navigate('ChangePassword')}
          accessibilityLabel="Cambiar contraseña"
          testID="button-change-password"
        >
          <MaterialCommunityIcons name="lock-reset" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Cambiar contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setShowLogoutModal(true)}
          accessibilityLabel="Cerrar sesión"
          testID="button-logout"
        >
          <MaterialCommunityIcons name="logout" size={24} color="#FF6B6B" />
          <Text style={[styles.itemText, { color: "#FF6B6B" }]}>Cerrar sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setShowDeleteModal(true)}
          accessibilityLabel="Eliminar cuenta"
          testID="button-delete-account"
        >
          <MaterialCommunityIcons name="delete" size={24} color="#FF6B6B" />
          <Text style={[styles.itemText, { color: "#FF6B6B" }]}>Eliminar cuenta</Text>
        </TouchableOpacity>

        {/* Separador */}
        <View style={styles.separator} />

        {/* Soporte */}
        <Text style={styles.sectionTitle}>Soporte</Text>
        <TouchableOpacity 
          style={styles.item}
          onPress={() => navigation.navigate('FAQ')}
          accessibilityLabel="Preguntas frecuentes"
          testID="button-faq"
        >
          <MaterialCommunityIcons name="help-circle" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Preguntas frecuentes</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.item}
          onPress={testNotification}
          accessibilityLabel="Probar notificación"
          testID="button-test-notification"
        >
          <MaterialCommunityIcons name="bell-ring" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Probar notificación</Text>
        </TouchableOpacity>

        {/* Separador */}
        <View style={styles.separator} />

        {/* Acerca de */}
        <Text style={styles.sectionTitle}>Acerca de</Text>
        <TouchableOpacity 
          style={styles.item}
          onPress={() => navigation.navigate('FaQ')}
          accessibilityLabel="Información de la aplicación"
          testID="button-about"
        >
          <MaterialCommunityIcons name="information" size={24} color="#1ADDDB" />
          <Text style={styles.itemText}>Información de la aplicación</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de Logout */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cerrar sesión</Text>
            <Text style={styles.modalText}>¿Estás seguro que deseas cerrar sesión?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Eliminar Cuenta */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Eliminar cuenta</Text>
            <Text style={styles.modalText}>¿Estás seguro que deseas eliminar tu cuenta? Esta acción no se puede deshacer.</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDelete]}
                onPress={handleDeleteAccount}
              >
                <Text style={[styles.modalButtonText, { color: "#FF6B6B" }]}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#030A24",
  },
  container: {
    flex: 1,
    backgroundColor: "#030A24",
    padding: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 43, 95, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(26, 221, 219, 0.1)",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  userEmail: {
    color: "#A3B8E8",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 12,
  },
  sectionTitle: {
    color: "#A3B8E8",
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 43, 95, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(26, 221, 219, 0.1)",
  },
  itemText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
    color: "#FFFFFF",
  },
  languageText: {
    color: "#A3B8E8",
    fontSize: 16,
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(26, 221, 219, 0.1)",
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1D2B5F",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    borderWidth: 1,
    borderColor: "rgba(26, 221, 219, 0.1)",
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  modalText: {
    color: "#A3B8E8",
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  modalButtonCancel: {
    backgroundColor: "rgba(26, 221, 219, 0.1)",
  },
  modalButtonConfirm: {
    backgroundColor: "#1ADDDB",
  },
  modalButtonDelete: {
    backgroundColor: "rgba(255, 107, 107, 0.1)",
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  timeSelectorContainer: {
    backgroundColor: "rgba(29, 43, 95, 0.8)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(26, 221, 219, 0.1)",
  },
  timeSelectorLabel: {
    color: "#A3B8E8",
    fontSize: 14,
    marginBottom: 8,
  },
  timeSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#22335C",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 8,
  },
  timeSelectorText: {
    color: "#FFFFFF",
    fontSize: 18,
    marginLeft: 12,
    fontWeight: 'bold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: "#1ADDDB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});

export default SettingsScreen;
