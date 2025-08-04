import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Linking } from 'react-native';

import WelcomeScreen from '../Screens/WelcomeScreen';

import UserInfo from '../Screens/UserInfo';
import DailyRoutine from '../Screens/DailyRoutine';
import PreferenceScreen from '../Screens/PreferenceScreen';
import OnboardingScreen from '../Screens/OnboardingScreen';
import NotificationScreen from '../Screens/NotificationScreen';
import ForecastScreen from '../Screens/ForecastScreen';
import SettingsScreen from '../Screens/SettingsScreen';

import TabNavigator, { TabParamList } from './TabNavigator';
import { navigationRef } from './navigationRef';

// Update RootStackParamList to include bypassOnboardingCheck parameter
export type RootStackParamList = {
  Welcome: { bypassOnboardingCheck?: boolean } | undefined;
  UserInfo: undefined;
  DailyRoutine: undefined;
  PreferenceScreen: undefined;
  OnboardingScreen: undefined;
  NotificationScreen: undefined;
  Settings: undefined;
  Forecast: { openCityModal?: boolean; fromHomeScreen?: boolean } | undefined;
  MainApp: NavigatorScreenParams<TabParamList> | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4361EE',
    background: '#b3d4ff',
    card: '#FFFFFF',
    text: '#333333',
    border: '#DDDDDD',
    notification: '#4361EE',
    placeholder: '#999999',
    surface: '#FFFFFF',
  },
  dark: false,
};

const linking = {
  enabled: true,
  prefixes: ['yourapp://', 'https://yourapp.com'],
  config: {
    screens: {
      Welcome: 'welcome',
      UserInfo: 'user-info',
      DailyRoutine: 'daily-routine',
      PreferenceScreen: 'preferences',
      OnboardingScreen: 'onboarding',
      NotificationScreen: 'notifications',
      Settings: 'settings',
      Forecast: 'forecast',
      MainApp: {
        screens: {
          HomeTab: 'home',
          Assistant: 'assistant',
          PlanningTab: 'planning',
          Commute: 'commute',
          Profile: 'profile',
        },
      },
    },
  },
};

const Navigations = () => {
  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Deep link URL:', url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={MyTheme}>
      <Stack.Navigator 
        initialRouteName="Welcome" 
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#b3d4ff' }, // Match WelcomeScreen background
          animation: 'fade' // Smooth fade transition
        }}>
        {/* Onboarding Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="UserInfo" component={UserInfo} />
        <Stack.Screen name="DailyRoutine" component={DailyRoutine} />
        <Stack.Screen name="PreferenceScreen" component={PreferenceScreen} />
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Forecast" component={ForecastScreen} />
        {/* Main App (Tab Navigator) */}
        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigations;

const styles = StyleSheet.create({});
