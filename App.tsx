// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

import SearchStack from './src/screens/SearchScreens';
import LineListScreen from './src/screens/LineListScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: '#1A237E',
            tabBarInactiveTintColor: 'gray',
            tabBarIcon: ({ color, size }) => {
              let icon: any = 'train';
              if (route.name === '乗換案内') icon = 'search';
              if (route.name === '路線一覧') icon = 'map';
              return <MaterialIcons name={icon} size={size} color={color} />;
            },
          })}>
          <Tab.Screen name="乗換案内" component={SearchStack} />
          <Tab.Screen name="路線一覧" component={LineListScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}