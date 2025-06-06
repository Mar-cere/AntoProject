import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifications from '../data/notifications';

// Configuración de las notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Función para registrar el token de notificación
export const registerForPushNotificationsAsync = async () => {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('¡Se requieren permisos para las notificaciones!');
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    await AsyncStorage.setItem('pushToken', token);
  } else {
    console.log('Las notificaciones push requieren un dispositivo físico');
  }

  return token;
};

// Función para programar una notificación local
export const scheduleLocalNotification = async (title, body, trigger) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
};

// Función para enviar una notificación inmediata
export const sendImmediateNotification = async (title, body) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
};

// Función para obtener una notificación aleatoria
const getRandomNotification = () => {
  const randomIndex = Math.floor(Math.random() * notifications.length);
  return notifications[randomIndex];
};

// Función para programar notificaciones diarias
export const scheduleDailyNotification = async (hour, minute) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const notification = getRandomNotification();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { type: 'daily' },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      android: {
        channelId: 'anto-notifications',
        smallIcon: 'notification-icon',
        color: '#1ADDDB',
      },
      ios: {
        sound: true,
      },
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    },
  });
  // Programar una notificación inmediata para que el usuario reciba una notificación al activar
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      data: { type: 'daily' },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      android: {
        channelId: 'anto-notifications',
        smallIcon: 'notification-icon',
        color: '#1ADDDB',
      },
      ios: {
        sound: true,
      },
    },
    trigger: null,
  });
};

// Función para programar notificaciones alternadas
export const scheduleAlternateNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  const notification = getRandomNotification();
  
  // Programar notificación para mañana
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notification.title,
      body: notification.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      hour: 10, // 10:00 AM
      minute: 0,
      repeats: false,
    },
  });

  // Programar la siguiente notificación para pasado mañana
  const nextNotification = getRandomNotification();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: nextNotification.title,
      body: nextNotification.body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: {
      hour: 10, // 10:00 AM
      minute: 0,
      repeats: false,
      // Se enviará en 48 horas
      seconds: 48 * 60 * 60,
    },
  });
};

// Función para programar múltiples notificaciones al día
export const scheduleMultipleDailyNotifications = async (times) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  for (const time of times) {
    const notification = getRandomNotification();
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: time.hour,
        minute: time.minute,
        repeats: true,
      },
    });
  }
};

// Función para cancelar todas las notificaciones
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

// Función para verificar el estado de las notificaciones
export const checkNotificationStatus = async () => {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
};

// Programar una notificación local para una tarea
export const scheduleTaskNotification = async (task) => {
  if (!Device.isDevice) return;

  if (Array.isArray(task.notifications)) {
    for (const notif of task.notifications) {
      if (notif.enabled && notif.time) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: task.title,
            body: task.description || 'Tienes una tarea pendiente en Anto',
            sound: true,
            data: { taskId: task._id }
          },
          trigger: new Date(notif.time)
        });
      }
    }
  }
};

// Cancelar todas las notificaciones de una tarea (por id)
export const cancelTaskNotifications = async (taskId) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data && notif.content.data.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
};

// Programar notificación para un hábito
export const scheduleHabitNotification = async (habit) => {
  if (!habit.reminder) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `¡No olvides tu hábito!`,
      body: `Recuerda: ${habit.title}`,
      sound: true,
      data: { habitId: habit._id }
    },
    trigger: new Date(habit.reminder)
  });
};

// Cancelar notificaciones de un hábito por id
export const cancelHabitNotifications = async (habitId) => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.content.data && notif.content.data.habitId === habitId) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
};
