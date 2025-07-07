// src/navigation/AppNavigator.js

import React, { useContext } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { View, ActivityIndicator } from "react-native";
import AuthScreen from "../screens/AuthScreen";
import VerificationPendingScreen from "../screens/VerificationPendingScreen";
import MainNavigator from "./MainNavigator";
import { AuthContext } from "../context/AuthContext";

// Removed unused import for navigation styling

const Stack = createStackNavigator();

export default function AppNavigator() {
  // Retrieve user, verification status, and loading state from AuthContext
  const { user, emailVerified, loading } = useContext(AuthContext);

  // Show loading screen while checking for existing session
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' } // Consistent background color for all screens
      }}
    >
      {!user ? (
        // If no user is authenticated, show the auth screen
        <Stack.Screen name="Auth" component={AuthScreen} />
      ) : !emailVerified ? (
        // If user exists but email isn't verified, show verification screen
        <Stack.Screen 
          name="VerifyEmail" 
          component={VerificationPendingScreen}
        />
      ) : (
        // If user is authenticated and verified, show the main app
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}