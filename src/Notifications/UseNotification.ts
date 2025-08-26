import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { useEffect } from 'react';
import DeviceInfo from 'react-native-device-info';
import { navigationRef } from '../navigations/navigationRef';

export const requestNotificationPermission = async () => {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    }

    if (Platform.OS === 'ios') {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return false;
      }
    }

    const token = await messaging().getToken();
    const deviceId = await DeviceInfo.getUniqueId();

    try {
      const response = await fetch('https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/saveDeviceToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ deviceId, token })
      });
      
      const responseData = await response.json().catch(() => null);
      
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}, message: ${JSON.stringify(responseData)}`);
      }
      
      return true;
    } catch (error) {
      return false;
    }
  } catch (error) {
    return false;
  }
};

export const useNotification = () => {
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async remoteMessage => {

      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.HIGH,
      });

      await notifee.displayNotification({
        title: remoteMessage.notification?.title ?? 'New message',
        body: remoteMessage.notification?.body ?? 'You have a new notification',
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
        },
      });
    });

    return unsubscribe;
  }, []);
};

const navigateToHome = () => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [
        {
          name: 'MainApp',
          state: {
            routes: [{ name: 'Assistant' }],
          },
        },
      ],
    });
  } else {
    setTimeout(navigateToHome, 300);
  }
};

export const useNotificationTapHandler = () => {
  useEffect(() => {
    const backgroundSubscription = messaging().onNotificationOpenedApp(remoteMessage => {
      navigateToHome();
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          navigateToHome();
        }
      });

    return () => {
      backgroundSubscription();
    };
  }, []);
};

export const disableNotifications = async () => {
  try {
    const deviceId = await DeviceInfo.getUniqueId();
    
    const response = await fetch('https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/deleteDeviceToken', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ deviceId })
    });

    if (!response.ok) {
      throw new Error(`Server responded with status: ${response.status}`);
    }

    await messaging().deleteToken();
    
    return true;
  } catch (error) {
    return false;
  }
};
