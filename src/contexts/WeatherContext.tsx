import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { WeatherData, ForecastData } from '../services/weatherService';
import useWeather from '../hooks/useWeather';
import { UserData } from '../Screens/UserInfo';

interface WeatherContextType {
  currentWeather: WeatherData | null;
  forecast: ForecastData | null;
  isLoading: boolean;
  error: { message: string } | null;
  isRefreshing: boolean;
  fetchWeatherForCity: (city: string) => Promise<WeatherData | null>;
  fetchForecastForCity: (city: string) => Promise<ForecastData | null>;
  setPreferredUnits: (units: 'metric' | 'imperial') => void;
  preferredUnits: 'metric' | 'imperial';
  forceRefresh: () => void;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

interface WeatherProviderProps {
  children: ReactNode;
}

export const WeatherProvider: React.FC<WeatherProviderProps> = ({ children }) => {
  const [preferredUnits, setPreferredUnits] = useState<'metric' | 'imperial'>('metric');
  const [userLocation, setUserLocation] = useState<string | undefined>(undefined);
  const [lastFetchedLocation, setLastFetchedLocation] = useState<string | undefined>(undefined);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [weatherSignature, setWeatherSignature] = useState<string>('');
  
  const { 
    currentWeather, 
    forecast, 
    isLoading, 
    error, 
    fetchWeather,
    fetchForecast
  } = useWeather({ units: preferredUnits, autoFetch: false });

  // Add effect to handle unit changes
  useEffect(() => {
    if (userLocation) {
      console.log("WeatherContext: Units changed, refreshing data with new units:", preferredUnits);
      setIsRefreshing(true);
      fetchForecast(userLocation).finally(() => {
        setIsRefreshing(false);
      });
    }
  }, [preferredUnits, userLocation, fetchForecast]);

  // Update the setPreferredUnits function to handle immediate updates
  const handleUnitChange = useCallback((units: 'metric' | 'imperial') => {
    console.log("WeatherContext: Changing units to:", units);
    setPreferredUnits(units);
    // The useEffect above will handle the data refresh
  }, []);

  // Calculate weather signature to detect significant changes
  useEffect(() => {
    if (currentWeather) {
      const newSignature = `${currentWeather.temperature.toFixed(0)}_${currentWeather.description}_${currentWeather.windSpeed.toFixed(0)}_${currentWeather.humidity}`;
      setWeatherSignature(newSignature);
    }
  }, [currentWeather]);

  // Helper function to check if weather data has significantly changed
  const hasWeatherSignificantlyChanged = (oldData: WeatherData, newData: WeatherData): boolean => {
    // Check for temperature change of more than 3 degrees
    if (Math.abs(oldData.temperature - newData.temperature) > 3) return true;
    
    // Check for change in weather condition (e.g., sunny to rainy)
    if (oldData.description !== newData.description) return true;
    
    // Check for significant wind speed change (more than 5 mph/kph)
    if (Math.abs(oldData.windSpeed - newData.windSpeed) > 5) return true;
    
    // Check for significant humidity change (more than 15%)
    if (Math.abs(oldData.humidity - newData.humidity) > 15) return true;
    
    return false;
  };

  // Wrapper around fetchForecast that applies our refresh logic
  const fetchForecastWithRefreshLogic = useCallback(async (city: string) => {
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    // Always fetch if it's a new location or first fetch
    if (city !== lastFetchedLocation || !currentWeather) {
      console.log("WeatherContext: New location or first fetch, fetching weather");
      const result = await fetchForecast(city);
      setLastFetchTime(now);
      setLastFetchedLocation(city);
      return result;
    }
    
    // If it's been less than 5 minutes since last fetch, don't fetch again
    // unless forced or there was an error
    if ((now - lastFetchTime) < fiveMinutesInMs && !error) {
      console.log("WeatherContext: Less than 5 minutes since last fetch, reusing cached data");
      return forecast;
    }
    
    // It's been more than 5 minutes, fetch fresh data
    console.log("WeatherContext: More than 5 minutes since last fetch, refreshing data");
    const result = await fetchForecast(city);
    setLastFetchTime(now);
    return result;
  }, [lastFetchedLocation, lastFetchTime, currentWeather, forecast, error, fetchForecast]);

  // Force refresh function to manually trigger weather data refresh
  const forceRefresh = useCallback(async () => {
    if (userLocation) {
      console.log("ForceRefresh: Bypassing cache and refreshing weather data for:", userLocation);
      setIsRefreshing(true);
      const result = await fetchForecast(userLocation);
      setLastFetchTime(Date.now());
      setIsRefreshing(false);
      return result;
    }
  }, [userLocation, fetchForecast]);

  // Update user location when UserData changes
  useEffect(() => {
    const userDataLocation = UserData.location;
    
    if (userDataLocation && userDataLocation !== '') {
      // Set the user location regardless
      setUserLocation(userDataLocation);
      
      // Only fetch if the location has changed or we don't have data yet
      if (userDataLocation !== lastFetchedLocation || !forecast) {
        fetchForecastWithRefreshLogic(userDataLocation);
      }
    }
  }, [UserData.location, lastFetchedLocation, fetchForecastWithRefreshLogic, forecast, isLoading]);
  
  // Refresh weather data periodically (every 5 minutes)
  useEffect(() => {
    if (!userLocation || userLocation === '') return;
    
    const refreshInterval = setInterval(() => {
      fetchForecastWithRefreshLogic(userLocation);
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [userLocation, fetchForecastWithRefreshLogic]);

  const fetchWeatherForCity = useCallback((city: string) => {
    if (city !== userLocation) {
      setUserLocation(city);
    }
    return fetchWeather(city);
  }, [userLocation, fetchWeather]);

  const fetchForecastForCity = useCallback((city: string) => {
    if (city !== userLocation) {
      setUserLocation(city);
    }
    return fetchForecastWithRefreshLogic(city);
  }, [userLocation, fetchForecastWithRefreshLogic]);

  return (
    <WeatherContext.Provider
      value={{
        currentWeather,
        forecast,
        isLoading,
        error,
        isRefreshing,
        fetchWeatherForCity,
        fetchForecastForCity,
        setPreferredUnits: handleUnitChange,
        preferredUnits,
        forceRefresh
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeatherContext = () => {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
};

export default WeatherContext; 