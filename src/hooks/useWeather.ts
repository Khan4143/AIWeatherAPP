import { useState, useEffect, useCallback } from 'react';
import { 
  fetchCurrentWeather, 
  fetchWeatherForecast, 
  fetchWeatherByCoordinates,
  WeatherData,
  ForecastData
} from '../services/weatherService';

interface WeatherState {
  currentWeather: WeatherData | null;
  forecast: ForecastData | null;
  isLoading: boolean;
  error: { message: string } | null;
}

interface UseWeatherProps {
  city?: string;
  lat?: number;
  lon?: number;
  units?: 'metric' | 'imperial' | 'standard';
  autoFetch?: boolean;
}

/**
 * Custom hook for fetching and managing weather data
 * @param props - Configuration options
 * @returns Weather state and functions
 */
const useWeather = (props?: UseWeatherProps) => {
  const { 
    city, 
    lat, 
    lon, 
    units = 'metric', 
    autoFetch = true 
  } = props || {};

  const [state, setState] = useState<WeatherState>({
    currentWeather: null,
    forecast: null,
    isLoading: false,
    error: null
  });

  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // Add effect to handle unit changes
  useEffect(() => {
    // If we have current weather data, fetch it again with new units
    if (state.currentWeather && !state.isLoading) {
      console.log("useWeather: Units changed, refreshing data with new units:", units);
      if (city) {
        fetchForecast(city);
      } else if (lat !== undefined && lon !== undefined) {
        fetchByCoordinates(lat, lon);
      }
    }
  }, [units]); // Only depend on units change

  /**
   * Fetch current weather data for a city
   * @param cityName - City name with country code e.g. "London, GB"
   */
  const fetchWeather = useCallback(async (cityName: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const weatherData = await fetchCurrentWeather(cityName, units);
      setState(prev => ({ 
        ...prev, 
        currentWeather: weatherData, 
        isLoading: false 
      }));
      return weatherData;
    } catch (error: any) {
      console.error(`Weather fetch error (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Will retry automatically via useEffect
      } else {
        setState(prev => ({ 
          ...prev, 
          error: { message: `Failed to fetch weather after ${MAX_RETRIES + 1} attempts: ${error.message}` }, 
          isLoading: false 
        }));
      }
      return null;
    }
  }, [units, retryCount]);

  /**
   * Fetch weather forecast data for a city
   * @param cityName - City name with country code e.g. "London, GB"
   */
  const fetchForecast = useCallback(async (cityName: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // First get current weather, as we need it regardless
      const weatherData = await fetchCurrentWeather(cityName, units);

      // Then get the forecast
      try {
        const forecastData = await fetchWeatherForecast(cityName, units);
        setState(prev => ({ 
          ...prev, 
          forecast: forecastData,
          currentWeather: weatherData, // Always update with latest current weather 
          isLoading: false 
        }));
        return forecastData;
      } catch (forecastError: any) {
        // If forecast fails but we have current weather, still show that
        console.error("Forecast fetch failed, but current weather succeeded:", forecastError.message);
        setState(prev => ({
          ...prev,
          currentWeather: weatherData,
          error: { message: `Forecast data unavailable: ${forecastError.message}` },
          isLoading: false
        }));
        return null;
      }
    } catch (error: any) {
      console.error(`Weather fetch error (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Will retry automatically via useEffect
      } else {
        setState(prev => ({ 
          ...prev, 
          error: { message: `Failed to fetch weather after ${MAX_RETRIES + 1} attempts: ${error.message}` }, 
          isLoading: false 
        }));
      }
      return null;
    }
  }, [units, retryCount]);

  /**
   * Fetch weather data using coordinates
   * @param latitude - Latitude
   * @param longitude - Longitude
   */
  const fetchByCoordinates = useCallback(async (latitude: number, longitude: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const weatherData = await fetchWeatherByCoordinates(latitude, longitude, units);
      setState(prev => ({ 
        ...prev, 
        currentWeather: weatherData, 
        isLoading: false 
      }));
      return weatherData;
    } catch (error: any) {
      console.error(`Weather fetch error (attempt ${retryCount + 1}):`, error.message);
      
      if (retryCount < MAX_RETRIES) {
        setRetryCount(prev => prev + 1);
        // Will retry automatically via useEffect
      } else {
        setState(prev => ({ 
          ...prev, 
          error: { message: `Failed to fetch weather after ${MAX_RETRIES + 1} attempts: ${error.message}` }, 
          isLoading: false 
        }));
      }
      return null;
    }
  }, [units, retryCount]);

  // Auto fetch weather data when city or coordinates change
  useEffect(() => {
    if (!autoFetch) return;
    
    const fetchData = async () => {
      if (city) {
        console.log(`useWeather: Auto-fetching forecast for city: ${city}`);
        await fetchForecast(city);
      } else if (lat !== undefined && lon !== undefined) {
        console.log(`useWeather: Auto-fetching by coordinates: ${lat},${lon}`);
        await fetchByCoordinates(lat, lon);
      } else {
        console.log(`useWeather: No city or coordinates provided, cannot auto-fetch`);
      }
    };

    fetchData();
    
    // If we have a retry count > 0, we should retry
    if (retryCount > 0) {
      const retryTimeout = setTimeout(() => {
        console.log(`Retrying weather fetch (attempt ${retryCount + 1})...`);
        fetchData();
      }, 2000); // Wait 2 seconds before retry
      
      return () => clearTimeout(retryTimeout);
    }
  }, [city, lat, lon, units, autoFetch, retryCount, fetchForecast, fetchByCoordinates]);

  // Reset retry count when city or coordinates change
  useEffect(() => {
    setRetryCount(0);
  }, [city, lat, lon, units]);

  return {
    ...state,
    fetchWeather,
    fetchForecast,
    fetchByCoordinates
  };
};

export default useWeather; 