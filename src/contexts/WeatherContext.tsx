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
    error: weatherError, 
    fetchWeather,
    fetchForecast
  } = useWeather({ units: preferredUnits, autoFetch: false });

  const error = weatherError || null;

  useEffect(() => {
    if (userLocation) {
      setIsRefreshing(true);
      fetchForecast(userLocation).finally(() => {
        setIsRefreshing(false);
      });
    }
  }, [preferredUnits, userLocation, fetchForecast]);

  const handleUnitChange = useCallback((units: 'metric' | 'imperial') => {
    setPreferredUnits(units);
  }, []);

  useEffect(() => {
    if (currentWeather) {
      const newSignature = `${currentWeather.temperature.toFixed(0)}_${currentWeather.description}_${currentWeather.windSpeed.toFixed(0)}_${currentWeather.humidity}`;
      setWeatherSignature(newSignature);
    }
  }, [currentWeather]);

  const hasWeatherSignificantlyChanged = (oldData: WeatherData, newData: WeatherData): boolean => {
    if (Math.abs(oldData.temperature - newData.temperature) > 3) return true;
    
    if (oldData.description !== newData.description) return true;
    
    if (Math.abs(oldData.windSpeed - newData.windSpeed) > 5) return true;
    
    if (Math.abs(oldData.humidity - newData.humidity) > 15) return true;
    
    return false;
  };

  const fetchForecastWithRefreshLogic = useCallback(async (city: string) => {
    const now = Date.now();
    const fiveMinutesInMs = 5 * 60 * 1000;
    
    if (city !== lastFetchedLocation || !currentWeather) {
      const result = await fetchForecast(city);
      setLastFetchTime(now);
      setLastFetchedLocation(city);
      return result;
    }
    
    if ((now - lastFetchTime) < fiveMinutesInMs) {
      return forecast;
    }
    
    const result = await fetchForecast(city);
    setLastFetchTime(now);
    return result;
  }, [lastFetchedLocation, lastFetchTime, currentWeather, forecast, fetchForecast]);

  const forceRefresh = useCallback(async () => {
    if (userLocation) {
      setIsRefreshing(true);
      const result = await fetchForecast(userLocation);
      setLastFetchTime(Date.now());
      setIsRefreshing(false);
      return result;
    }
  }, [userLocation, fetchForecast]);

  useEffect(() => {
    const userDataLocation = UserData.location;
    
    if (userDataLocation && userDataLocation !== '') {
      setUserLocation(userDataLocation);
      
      if (userDataLocation !== lastFetchedLocation || !forecast) {
        fetchForecastWithRefreshLogic(userDataLocation);
      }
    }
  }, [UserData.location, lastFetchedLocation, fetchForecastWithRefreshLogic, forecast, isLoading]);
  
  useEffect(() => {
    if (!userLocation || userLocation === '') return;
    
    const refreshInterval = setInterval(() => {
      fetchForecastWithRefreshLogic(userLocation);
    }, 5 * 60 * 1000);
    
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