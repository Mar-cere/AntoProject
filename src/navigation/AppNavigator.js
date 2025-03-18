import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import TabNavigator from "./TabNavigator";
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import NewPasswordScreen from '../screens/NewPasswordScreen';

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
}
