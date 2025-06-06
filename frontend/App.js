import React, { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import notifications from './src/data/notifications';
import { AuthProvider } from './src/context/AuthContext';

function getRandomNotificationByTime(hour) {
  let pool = [];
  if (hour >= 6 && hour < 12) {
    pool = [...notifications.morning, ...notifications.any];
  } else if (hour >= 12 && hour < 19) {
    pool = [...notifications.afternoon, ...notifications.any];
  } else {
    pool = [...notifications.evening, ...notifications.any];
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

export default function App() {
  // Usar una referencia al navegador en lugar de useNavigation
  const navigationRef = useRef(null);

  // Manejar enlaces entrantes
  useEffect(() => {
    // Procesar enlaces iniciales
    Linking.getInitialURL().then((url) => {
      if (url) {
        processDeepLink(url);
      }
    });

    // Escuchar enlaces entrantes cuando la app está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Procesar deep links
  const processDeepLink = (url) => {
    // Analizar URL
    const parsed = new URL(url);
    
    // Verificar si es una URL de restablecimiento de contraseña
    if (parsed.pathname.includes('resetpassword')) {
      const params = new URLSearchParams(parsed.search);
      const token = params.get('token');
      const email = params.get('email');
      
      if (token && email && navigationRef.current) {
        // Navegar a la pantalla de nueva contraseña con los parámetros
        navigationRef.current.navigate('NewPassword', { token, email });
      }
    }
  };

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificación recibida:', notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Respuesta a notificación:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('¡Las notificaciones están desactivadas!');
      }
    })();
  }, []);

  useEffect(() => {
    const scheduleDailyNotifications = async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Notificación de la mañana (8:00 AM)
      const morningNotification = getRandomNotificationByTime(8);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: morningNotification.title,
          body: morningNotification.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: 8,
          minute: 0,
          repeats: true,
        },
      });

      // Notificación de la tarde (19:00 PM)
      const eveningNotification = getRandomNotificationByTime(19);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: eveningNotification.title,
          body: eveningNotification.body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          hour: 19,
          minute: 0,
          repeats: true,
        },
      });
    };

    scheduleDailyNotifications();
  }, []);

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <StackNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
