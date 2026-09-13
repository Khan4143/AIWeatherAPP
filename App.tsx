import 'react-native-get-random-values';

import React, {useEffect, useState} from 'react';
import {
  StatusBar,
  StyleSheet,
  AppState,
  InteractionManager,
  View,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import Navigations from './src/navigations/Navigations';
import {WeatherProvider} from './src/contexts/WeatherContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useNotification,
  useNotificationTapHandler,
  requestNotificationPermission,
} from './src/Notifications/UseNotification';
import '@react-native-firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {fetchWeatherByCoordinates} from './src/services/weatherService';
import Orientation from 'react-native-orientation-locker';
import notifee from '@notifee/react-native';
import {rescheduleAllEventNotifications} from './src/Notifications/EventNotifications';
import {AdMobProvider} from './src/contexts/AdContext';
import BootSplash from 'react-native-bootsplash';

// Google Mobile Ads + Consent
import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import {DEMO_MODE} from './src/config/appConfig';

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
  const [appReady, setAppReady] = useState(false);
  const colorScheme = useColorScheme();
  const safeAreaBg = colorScheme === 'dark' ? '#000000' : '#ffffff';

  useNotification();
  useNotificationTapHandler();

  useEffect(() => {
    let cancelled = false;

    const hideSplashSafely = async () => {
      await InteractionManager.runAfterInteractions();
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve()),
      );
      setTimeout(() => {
        if (!cancelled) {
          BootSplash.hide({fade: true}).catch(() => {});
        }
      }, 0);
    };

    hideSplashSafely();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 App initializing...');
        if (DEMO_MODE) {
          Orientation.lockToPortrait();
          setAppReady(true);
          return;
        }

        await requestNotificationPermission();

        notifee.onBackgroundEvent(async ({type, detail}) => {
          console.log('📱 Notifee background event:', type, detail);
        });

        await rescheduleAllEventNotifications();
        await restoreWeatherData();
        Orientation.lockToPortrait();

        // --- Google Ads Consent Flow ---
        await mobileAds().initialize();

        try {
          const consentInfo = await AdsConsent.requestInfoUpdate();

          if (consentInfo.isConsentFormAvailable) {
            await AdsConsent.showForm(); // ✅ Correct method
            console.log('✅ Consent form shown');
          }
        } catch (consentError) {
          console.log('⚠️ Consent flow error:', consentError);
        }
        // --- End Consent Flow ---

        InteractionManager.runAfterInteractions(() => {
          console.log('✅ App fully ready');
          setAppReady(true);
        });
      } catch (error) {
        console.error('❌ Error during initialization:', error);
        setAppReady(true);
      }
    };

    initializeApp();

    const subscription = AppState.addEventListener(
      'change',
      nextAppState => {
        if (nextAppState === 'active') {
          console.log('💡 App resumed from background');
          restoreWeatherData();
          Orientation.lockToPortrait();
        }
      },
    );

    return () => {
      console.log('🧹 Cleaning up App listener');
      subscription.remove();
    };
  }, []);

  if (!appReady) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#4361EE" />
      </View>
    );
  }

  return (
    <AdMobProvider>
      <WeatherProvider>
        <SafeAreaProvider>
          <SafeAreaView style={{flex: 1, backgroundColor: safeAreaBg}} >
            <StatusBar backgroundColor="transparent" barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
            <Navigations />
          </SafeAreaView>
        </SafeAreaProvider>
      </WeatherProvider>
    </AdMobProvider>
  );
};

export default App;

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#ffffff', // match your native splash background
    alignItems: 'center',
    justifyContent: 'center',
  },
});
