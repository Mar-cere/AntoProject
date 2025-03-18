import React, { useEffect, useRef } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import { Linking } from 'react-native';

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

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <StackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
