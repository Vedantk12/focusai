import React from 'react';
import { LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors } from './src/theme/colors';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LoginScreen      from './src/screens/LoginScreen';
import RegisterScreen   from './src/screens/RegisterScreen';
import DashboardScreen  from './src/screens/DashboardScreen';
import LogScreen        from './src/screens/LogScreen';
import HistoryScreen    from './src/screens/HistoryScreen';

LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
]);

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// Bottom tab navigator — shown after login
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  colors.card,
          borderTopColor:   colors.cardBorder,
          borderTopWidth:   1,
          paddingBottom:    8,
          paddingTop:       8,
          height:           64,
        },
        tabBarActiveTintColor:   colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'home'         : 'home-outline',
            Log:       focused ? 'add-circle'   : 'add-circle-outline',
            History:   focused ? 'bar-chart'    : 'bar-chart-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Log"       component={LogScreen} />
      <Tab.Screen name="History"   component={HistoryScreen} />
    </Tab.Navigator>
  );
}

// Root stack navigator
export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login"      component={LoginScreen} />
        <Stack.Screen name="Register"   component={RegisterScreen} />
        <Stack.Screen name="MainTabs"   component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}