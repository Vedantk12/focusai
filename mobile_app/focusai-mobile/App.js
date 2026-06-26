import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';
import OnboardingScreen  from './src/screens/OnboardingScreen';
import LoginScreen       from './src/screens/LoginScreen';
import RegisterScreen    from './src/screens/RegisterScreen';
import DashboardScreen   from './src/screens/DashboardScreen';
import LogScreen         from './src/screens/LogScreen';
import HistoryScreen     from './src/screens/HistoryScreen';
import CalendarScreen    from './src/screens/CalendarScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// Calendar has its own Stack so tapping a date goes to Log INSIDE calendar tab
const CalendarStack = createStackNavigator();
function CalendarStackScreen() {
  return (
    <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
      <CalendarStack.Screen name="CalendarMain" component={CalendarScreen} />
      <CalendarStack.Screen name="Log"          component={LogScreen} />
    </CalendarStack.Navigator>
  );
}

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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Dashboard: focused ? 'home'      : 'home-outline',
            Calendar:  focused ? 'calendar'  : 'calendar-outline',
            History:   focused ? 'bar-chart' : 'bar-chart-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Calendar"  component={CalendarStackScreen} />
      <Tab.Screen name="History"   component={HistoryScreen} />
    </Tab.Navigator>
  );
}

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