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
        const timezone = (() => {
          try {
            // Prefer react-native-localize if available for IANA tz
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const RNLocalize = require('react-native-localize');
            if (RNLocalize && typeof RNLocalize.getTimeZone === 'function') {
              const tz = RNLocalize.getTimeZone();
              if (typeof tz === 'string' && tz.length > 0) return tz;
            }
            const maybe = (DeviceInfo as any).getTimezone || (DeviceInfo as any).getTimeZone;
            if (typeof maybe === 'function') {
              const value = maybe.call(DeviceInfo);
              if (typeof value === 'string' && value.length > 0) return value;
            }
          } catch {}
          const offsetMinutes = new Date().getTimezoneOffset();
          const sign = offsetMinutes <= 0 ? '+' : '-';
          const abs = Math.abs(offsetMinutes);
          const hh = String(Math.floor(abs / 60)).padStart(2, '0');
          const mm = String(abs % 60).padStart(2, '0');
          return `UTC${sign}${hh}:${mm}`;
        })();

        const timezoneOffsetMinutes = -new Date().getTimezoneOffset();
  

        
        const response = await fetch('https://us-central1-ai-weather-app-f69fc.cloudfunctions.net/saveDeviceData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceId,
            timezone,
            timezoneOffsetMinutes,
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
  
        return { success: true, data: responseData };
      } catch (error) {
        return { success: false, error };
      }
    };
  
    return { saveDeviceData };
  };
  