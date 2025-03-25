import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";
import SettingsScreen from "../screens/SettingsScreen";
import RegisterScreen from "../screens/RegisterScreen";
import SignInScreen from "../screens/SignInScreen";
import DashScreen from "../screens/DashScreen";
import ChatScreen from "../screens/ChatScreen";
import FaQScreen from "../screens/FaQScreen";
import RecoverPasswordScreen from '../screens/RecoverPasswordScreen';
import VerifyCodeScreen from '../screens/VerifyCodeScreen';
import NewPasswordScreen from '../screens/NewPasswordScreen';
import TaskScreen from '../screens/TaskScreen';
import HabitsScreen from '../screens/HabitsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import { ROUTES } from '../../backend/routes/userRoutes';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#1D1B70" },
        headerTintColor: "#fff",
        headerShown: false,
        headerTitleStyle: { fontWeight: "bold" },
        cardStyle: { backgroundColor: '#030A24' }
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="Dashboard" component={DashScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="FaQ" component={FaQScreen} />
      <Stack.Screen name={ROUTES.RECOVER_PASSWORD} component={RecoverPasswordScreen} />
      <Stack.Screen name={ROUTES.VERIFY_CODE} component={VerifyCodeScreen} />
      <Stack.Screen name={ROUTES.NEW_PASSWORD} component={NewPasswordScreen} />
      <Stack.Screen name="Tasks" component={TaskScreen} />
      <Stack.Screen name="Habits" component={HabitsScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
