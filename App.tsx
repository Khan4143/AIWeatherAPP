// Import the crypto polyfill
import 'react-native-get-random-values';

import {StatusBar, StyleSheet, AppState} from 'react-native';
import React, {useEffect} from 'react';
import Navigations from './src/navigations/Navigations';
import {WeatherProvider} from './src/contexts/WeatherContext';
import {useNotification, useNotificationTapHandler} from './src/Notifications/UseNotification';
import '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchWeatherByCoordinates} from './src/services/weatherService'; // ✅ Make sure this path is correct

const restoreWeatherData = async () => {
  try {
    const location = await AsyncStorage.getItem('lastLocation');
    if (location) {
      const {lat, lon} = JSON.parse(location);
      console.log('🔁 Restoring weather data for:', lat, lon);
      await fetchWeatherByCoordinates(lat, lon); // ✅ Call the actual fetch function
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
    console.log('App component initialized');

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('💡 App resumed from background');
        restoreWeatherData(); // ✅ Restore weather data on resume
      }
    });

    return () => {
      console.log('App component unmounted');
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
