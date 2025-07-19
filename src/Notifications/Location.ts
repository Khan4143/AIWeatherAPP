import DeviceInfo from 'react-native-device-info';

export const useDeviceMeta = () => {
    const saveDeviceData = async ({
      latitude,
      longitude,
      cityDisplay,
    }: {
      latitude: number;
      longitude: number;
      cityDisplay: string;
    }) => {
      try {
        const deviceId = await DeviceInfo.getUniqueId();
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
        console.log('📍 Sending location data to backend:', {
          deviceId,
          timezone,
          location: { lat: latitude, lng: longitude },
          city: cityDisplay,
        });
        
        const response = await fetch('https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/saveDeviceData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            timezone,
            location: {
              lat: latitude,
              lng: longitude,
            },
            city: cityDisplay,
          }),
        });
        
        const responseData = await response.json().catch(() => null);
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}, message: ${JSON.stringify(responseData)}`);
        }
  
        console.log('✅ Device meta saved to Firestore:', responseData);
        return { success: true, data: responseData };
      } catch (error) {
        console.error('❌ Failed to save device meta:', error);
        return { success: false, error };
      }
    };
  
    return { saveDeviceData };
  };
  