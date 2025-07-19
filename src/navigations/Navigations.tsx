import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Linking } from 'react-native';

import WelcomeScreen from '../Screens/WelcomeScreen';
import IntroScreen from '../Screens/IntroScreen';
import UserInfo from '../Screens/UserInfo';
import DailyRoutine from '../Screens/DailyRoutine';
import PreferenceScreen from '../Screens/PreferenceScreen';
import OnboardingScreen from '../Screens/OnboardingScreen';
import NotificationScreen from '../Screens/NotificationScreen';

import TabNavigator, { TabParamList } from './TabNavigator';
import { navigationRef } from './navigationRef';

// Define RootStackParamList with MainApp typed as nested Tab navigator params
export type RootStackParamList = {
  Welcome: undefined;
  Intro: undefined;
  UserInfo: undefined;
  DailyRoutine: undefined;
  PreferenceScreen: undefined;
  OnboardingScreen: undefined;
  NotificationScreen: undefined;

  MainApp: NavigatorScreenParams<TabParamList> | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#4361EE',
    background: '#FFFFFF',
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
      Intro: 'intro',
      UserInfo: 'user-info',
      DailyRoutine: 'daily-routine',
      PreferenceScreen: 'preferences',
      OnboardingScreen: 'onboarding',
      NotificationScreen: 'notifications',
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
  fallback: {
    screens: {
      Welcome: '*',
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
    <NavigationContainer ref={navigationRef} linking={linking} theme={MyTheme} fallback={<Text>Loading...</Text>}>
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        {/* Onboarding Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intro" component={IntroScreen} />
        <Stack.Screen name="UserInfo" component={UserInfo} />
        <Stack.Screen name="DailyRoutine" component={DailyRoutine} />
        <Stack.Screen name="PreferenceScreen" component={PreferenceScreen} />
        <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />

        {/* Main App (Tab Navigator) */}
        <Stack.Screen name="MainApp" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigations;

const styles = StyleSheet.create({});
