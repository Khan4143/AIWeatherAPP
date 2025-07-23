import 'react-native-get-random-values';

import React, {useEffect, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  AppState,
  InteractionManager,
} from 'react-native';
import Navigations from './src/navigations/Navigations';
import {WeatherProvider} from './src/contexts/WeatherContext';
import {
  useNotification,
  useNotificationTapHandler,
} from './src/Notifications/UseNotification';
import '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchWeatherByCoordinates} from './src/services/weatherService';
import Orientation from 'react-native-orientation-locker';

const restoreWeatherData = async () => {
  try {
    const location = await AsyncStorage.getItem('lastLocation');
    if (location) {
      const {lat, lon} = JSON.parse(location);
      console.log('🔁 Restoring weather data for:', lat, lon);
      await fetchWeatherByCoordinates(lat, lon);
    } else {
      console.log('⚠️ No saved location to restore weather data');
    }
  } catch (error) {
    console.log('❌ Failed to restore weather data:', error);
  }
};

const App = () => {
  useNotification();
  useNotificationTapHandler();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        await restoreWeatherData();
        Orientation.lockToPortrait();
        
        // Wait for all interactions to complete
        InteractionManager.runAfterInteractions(() => {
          console.log('✅ App fully ready');
        });
      } catch (error) {
        console.error('❌ Error during initialization:', error);
      }
    };

    initializeApp();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('💡 App resumed from background');
        restoreWeatherData();
        Orientation.lockToPortrait();
      }
    });

    return () => {
      console.log('🧹 Cleaning up App listener');
      subscription.remove();
    };
  }, []);

  return (
    <WeatherProvider>
      <StatusBar backgroundColor="transparent" barStyle="light-content" />
      <Navigations />
    </WeatherProvider>
  );
};

export default App;

const styles = StyleSheet.create({});
