import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

// Importar pantallas principales
import HomeScreen from "../screens/HomeScreen";
import ChatScreen from "../screens/ChatScreen";
import JournalScreen from "../screens/JournalScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import RegisterScreen from "../screens/RegisterScreen";
import FaQScreen from "../screens/FaQScreen";

// Crear navegadores
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// **Stack para pantallas secundarias (se abren dentro de otra)**
const SecondaryStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Journal" component={JournalScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="FaQ" component={FaQScreen} />
    </Stack.Navigator>
  );
};

// **Navegación con pestañas (Bottom Tabs)**
export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Inicio") iconName = "home-outline";
          else if (route.name === "Chat") iconName = "chatbubble-outline";
          else if (route.name === "Journal") iconName = "book-outline";
          else if (route.name === "Perfil") iconName = "person-outline";
          else if (route.name === "Ajustes") iconName = "settings-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: { backgroundColor: "#1D1B70" },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#A3ADDB",
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Chat" component={SecondaryStack} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
      <Tab.Screen name="Ajustes" component={SettingsScreen} />
      <Tab.Screen name="FaQ" component={FaQScreen} />
    </Tab.Navigator>
  );
}

