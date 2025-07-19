import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import adjust from '../utils/adjust';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants/dimesions';
import { CommonActions } from '@react-navigation/native';
import { useWeatherContext } from '../contexts/WeatherContext';
import { UserData } from '../Screens/UserInfo';
import { useFocusEffect } from '@react-navigation/native';
import { generateResponse } from '../services/openaiService';
import { PreferenceData } from '../Screens/PreferenceScreen';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Storage key for saved cities
const SAVED_CITIES_KEY = 'skylar_saved_cities';

// List of popular cities available in OpenWeather API
const POPULAR_CITIES = [
  'New York, US',
  'Los Angeles, US',
  'London, GB',
  'Tokyo, JP',
  'Paris, FR',
  'Berlin, DE',
  'Sydney, AU',
  'Mumbai, IN',
  'Beijing, CN',
  'Rio de Janeiro, BR',
];

// Type definition for city objects
interface CityObject {
  key: string;
  display: string;
}

// Helper function to get the time of day greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Helper function to format time from Unix timestamp - Update to include AM/PM
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

// Simple function to format time for hourly display
const formatHour = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString([], { hour: '2-digit', hour12: true });
};

// Helper function to get weather icon based on OpenWeather icon code - for Feather icons
const getWeatherIcon = (iconCode: string) => {
  if (!iconCode) return 'cloud';
  
  const iconMap: {[key: string]: string} = {
    '01d': 'sun', // clear sky day
    '01n': 'moon', // clear sky night
    '02d': 'cloud-sun', // few clouds day
    '02n': 'cloud-moon', // few clouds night
    '03d': 'cloud', // scattered clouds day
    '03n': 'cloud', // scattered clouds night
    '04d': 'cloud', // broken clouds day
    '04n': 'cloud', // broken clouds night
    '09d': 'cloud-rain', // shower rain day
    '09n': 'cloud-rain', // shower rain night
    '10d': 'cloud-drizzle', // rain day
    '10n': 'cloud-drizzle', // rain night
    '11d': 'cloud-lightning', // thunderstorm day
    '11n': 'cloud-lightning', // thunderstorm night
    '13d': 'cloud-snow', // snow day
    '13n': 'cloud-snow', // snow night
    '50d': 'wind', // mist day
    '50n': 'wind', // mist night
  };
  
  // Default icon if we don't have a mapping
  return iconMap[iconCode] || 'cloud';
};

// Helper function to get MaterialCommunityIcons weather icons
const getWeatherIconMaterial = (iconCode: string) => {
  if (!iconCode) return 'weather-cloudy';
  
  // Log the icon code for debugging
  console.log('Weather icon code received:', iconCode);
  
  // Enhanced icon mapping with more accurate weather states
  const materialIconMap: {[key: string]: string} = {
    // Clear sky
    '01d': 'weather-sunny', // clear sky day
    '01n': 'weather-night', // clear sky night
    
    // Few clouds (11-25%)
    '02d': 'weather-partly-cloudy', // few clouds day
    '02n': 'weather-night-partly-cloudy', // few clouds night
    
    // Scattered clouds (25-50%)
    '03d': 'weather-cloudy', // scattered clouds day
    '03n': 'weather-cloudy', // scattered clouds night
    
    // Broken/overcast clouds (51-100%)
    '04d': 'weather-cloudy', // broken clouds day
    '04n': 'weather-cloudy', // broken clouds night
    
    // Shower rain - intermittent intense rain
    '09d': 'weather-pouring', // shower rain day
    '09n': 'weather-pouring', // shower rain night
    
    // Rain - continuous precipitation
    '10d': 'weather-rainy', // rain day
    '10n': 'weather-rainy', // rain night
    
    // Thunderstorm
    '11d': 'weather-lightning', // thunderstorm day
    '11n': 'weather-lightning', // thunderstorm night
    
    // Snow
    '13d': 'weather-snowy', // snow day
    '13n': 'weather-snowy', // snow night
    
    // Mist/fog/haze
    '50d': 'weather-fog', // mist day
    '50n': 'weather-fog', // mist night
  };
  
  // Get the mapped icon or fall back to cloudy
  const iconName = materialIconMap[iconCode] || 'weather-cloudy';
  console.log('Mapped to icon:', iconName);
  return iconName;
};

// Helper to get appropriate icon color
const getWeatherIconColor = (iconCode: string) => {
  if (!iconCode) return '#87CEEB'; // Default sky blue
  
  // Log the icon code for color selection
  console.log('Selecting color for icon code:', iconCode);
  
  // Extract the condition code and day/night indicator
  const conditionCode = iconCode.substring(0, 2);
  const isDayTime = iconCode.endsWith('d');
  
  // More nuanced color mapping based on weather condition and time of day
  switch(conditionCode) {
    case '01': // clear sky
      return isDayTime ? '#FFD700' : '#4A6FA5'; // gold for day, dark blue for night
    
    case '02': // few clouds
      return isDayTime ? '#87CEEB' : '#4A6FA5'; // sky blue for day, dark blue for night
    
    case '03': // scattered clouds
    case '04': // broken clouds
      return isDayTime ? '#A9A9A9' : '#6C757D'; // gray for day, darker gray for night
    
    case '09': // shower rain
      return isDayTime ? '#4169E1' : '#364FC7'; // royal blue for day, darker blue for night
    
    case '10': // rain
      return isDayTime ? '#4682B4' : '#0D47A1'; // steel blue for day, navy for night
    
    case '11': // thunderstorm
      return isDayTime ? '#9370DB' : '#6A0DAD'; // medium purple for day, darker purple for night
    
    case '13': // snow
      return isDayTime ? '#E0FFFF' : '#B0E0E6'; // light cyan for day, powder blue for night
    
    case '50': // mist/fog
      return isDayTime ? '#708090' : '#556677'; // slate gray for day, darker slate for night
  }
  
  // Default fallback
  return isDayTime ? '#87CEEB' : '#4A6FA5'; // sky blue for day, dark blue for night
};

// Helper to map keywords to a small set of general icons for health tips
const getHealthTipIcon = (tip: string) => {
  const lower = tip.toLowerCase();
  if (lower.includes('hydration') || lower.includes('hydrated') || lower.includes('water')) return <Ionicons name="water-outline" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('clothing') || lower.includes('shirt') || lower.includes('t-shirt') || lower.includes('layers') || lower.includes('breathable')) return <MaterialCommunityIcons name="tshirt-crew" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('sunscreen') || lower.includes('screen') || lower.includes('uv') || lower.includes('spf') || lower.includes('sun protection') || lower.includes('sunglass')) return <MaterialCommunityIcons name="sunglasses" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('shoes') || lower.includes('footwear') || lower.includes('supportive')) return <MaterialCommunityIcons name="shoe-sneaker" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('shade') || lower.includes('sun') || lower.includes('color') || lower.includes('light color') || lower.includes('reflect')) return <MaterialCommunityIcons name="weather-sunny" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('medication') || lower.includes('medicine')) return <MaterialCommunityIcons name="medical-bag" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('heart') || lower.includes('monitor') || lower.includes('blood pressure') || lower.includes('activity')) return <MaterialCommunityIcons name="heart-pulse" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  // Fallback: t-shirt for general health, heart for medical/monitoring
  if (lower.includes('health') || lower.includes('well-being') || lower.includes('wellbeing')) return <MaterialCommunityIcons name="heart-pulse" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  return <MaterialCommunityIcons name="tshirt-crew" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
};

// Helper to map keywords to a small set of general icons for outfit tips
const getOutfitTipIcon = (tip: string) => {
  const lower = tip.toLowerCase();
  if (lower.includes('t-shirt') || lower.includes('shirt') || lower.includes('clothing') || lower.includes('layers') || lower.includes('breathable')) return <MaterialCommunityIcons name="tshirt-crew" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('sunglass') || lower.includes('uv') || lower.includes('sun protection') || lower.includes('spf') || lower.includes('sunscreen') || lower.includes('screen')) return <MaterialCommunityIcons name="sunglasses" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('shoes') || lower.includes('sneaker') || lower.includes('footwear') || lower.includes('supportive')) return <MaterialCommunityIcons name="shoe-sneaker" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('sun') || lower.includes('color') || lower.includes('light color') || lower.includes('reflect')) return <MaterialCommunityIcons name="weather-sunny" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('hat')) return <MaterialCommunityIcons name="hat-fedora" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  if (lower.includes('jeans') || lower.includes('chinos') || lower.includes('pants')) return <MaterialCommunityIcons name="pants" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
  // Fallback: t-shirt for general outfit
  return <MaterialCommunityIcons name="tshirt-crew" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />;
};

type RootStackParamList = {
  Forecast: { openCityModal?: boolean; fromHomeScreen?: boolean } | undefined;
  // ... add other screens as needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Forecast'>;

const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  // Add state for modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const { 
    currentWeather, 
    forecast, 
    isLoading, 
    error, 
    fetchForecastForCity, 
    preferredUnits,
    forceRefresh 
  } = useWeatherContext();
  const [userName, setUserName] = useState('');
  const [outfitLoading, setOutfitLoading] = useState(false);
  const [outfitGemini, setOutfitGemini] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthGemini, setHealthGemini] = useState<string | null>(null);
  const [outfitCardLoading, setOutfitCardLoading] = useState(false);
  const [outfitCardText, setOutfitCardText] = useState<string>('Skylar\'s picked today\'s best casual look for cool weather');
  const [healthCardLoading, setHealthCardLoading] = useState(false);
  const [healthCardText, setHealthCardText] = useState<string>('High pollen count today\nStrong UV rays 1-4 PM');

  // Cache for outfit and health card text to avoid unnecessary API calls
  const [lastOutfitUpdate, setLastOutfitUpdate] = useState(0);
  const [lastHealthUpdate, setLastHealthUpdate] = useState(0);
  
  // Refs should be at the top level of the component, not inside hooks or callbacks
  const lastVisitTimeRef = React.useRef<number>(Date.now());
  const lastUpdateRef = React.useRef<number>(0);
  
  const oneHourMs = 60 * 60 * 1000;
  const twoHoursMs = 2 * 60 * 60 * 1000;

  // Get temperature unit symbol
  const tempUnit = preferredUnits === 'imperial' ? 'F' : 'C';

  // Get user health concerns for personalized health tips
  const userHealthConcerns = PreferenceData?.healthConcerns || [];

  // Compute a weather signature to detect changes
  const weatherSignature = useMemo(() => {
    if (!currentWeather) return '';
    return [
      currentWeather.location,
      currentWeather.temperature,
      currentWeather.description,
      currentWeather.humidity,
      currentWeather.windSpeed
    ].join('|');
  }, [currentWeather]);

  // Set up intervals to check for data freshness and user name
  useEffect(() => {
    if (UserData.location) {
      console.log("HomeScreen - Fetching weather for location:", UserData.location);
      fetchForecastForCity(UserData.location);
    }
    // Set user name
    setUserName(UserData.gender === 'female' ? 'Sarah' : UserData.gender === 'male' ? 'Michael' : 'User');
  }, [UserData.location]);

  // Use useFocusEffect to detect when the HomeScreen is focused - but don't force refresh every time
  useFocusEffect(
    React.useCallback(() => {
      console.log("HomeScreen - Screen focused");
      // Only force refresh if we've been away for a while (more than 10 minutes)
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      if (now - lastVisitTimeRef.current > tenMinutes && UserData.location) {
        console.log("HomeScreen - More than 10 minutes since last focus, refreshing data");
        forceRefresh();
      } else {
        console.log("HomeScreen - Recent visit, no need to refresh");
      }
      
      lastVisitTimeRef.current = now;
      
      return () => {
        // Cleanup function that runs when the screen is unfocused
        console.log("HomeScreen - Screen unfocused");
      };
    }, [forceRefresh])
  );

  // Fetch concise Gemini responses for card summaries - with rate limiting
  useEffect(() => {
    const fetchOutfitCard = async () => {
      if (currentWeather) {
        const now = Date.now();
        // Only update if we haven't updated in the last hour or weather has changed significantly
        if (now - lastOutfitUpdate > oneHourMs || !outfitCardText || outfitCardText.includes('Unable to fetch')) {
        setOutfitCardLoading(true);
        try {
          const res = await generateResponse(
            'In 2 short lines maximum, what is the best outfit for today based on the weather? No greetings, no extra details, just direct and relevant advice.',
            currentWeather
          );
          // Only show the first 2 lines, trimmed
          const lines = res.text.trim().split(/\r?\n/).filter(Boolean);
          setOutfitCardText(lines.slice(0, 2).join(' '));
            setLastOutfitUpdate(now);
        } catch {
          setOutfitCardText('Unable to fetch outfit suggestion.');
        } finally {
          setOutfitCardLoading(false);
          }
        } else {
          console.log("HomeScreen - Skipping outfit card update, using cached data");
        }
      }
    };
    const fetchHealthCard = async () => {
      if (currentWeather) {
        const now = Date.now();
        // Only update if we haven't updated in the last hour or weather has changed significantly
        if (now - lastHealthUpdate > oneHourMs || !healthCardText || healthCardText.includes('Unable to fetch')) {
        setHealthCardLoading(true);
        try {
          const res = await generateResponse(
            'In 2 short lines maximum, what are the most important health alerts or tips for today based on the weather? No greetings, no extra details, just direct and relevant advice.',
            currentWeather
          );
          // Only show the first 2 lines, trimmed
          const lines = res.text.trim().split(/\r?\n/).filter(Boolean);
          setHealthCardText(lines.slice(0, 2).join(' '));
            setLastHealthUpdate(now);
        } catch {
          setHealthCardText('Unable to fetch health alerts.');
        } finally {
          setHealthCardLoading(false);
          }
        } else {
          console.log("HomeScreen - Skipping health card update, using cached data");
        }
      }
    };
    fetchOutfitCard();
    fetchHealthCard();
  }, [currentWeather?.temperature, currentWeather?.description, currentWeather?.humidity]);

  // Fetch Gemini responses only when weather changes
  useEffect(() => {
    if (!currentWeather) return;
    let cancelled = false;

    // Define a threshold for when we should refresh the data
    const now = Date.now();
    
    // Only fetch new data if it's been more than 2 hours or we don't have data yet
    if (now - lastUpdateRef.current > twoHoursMs || !outfitGemini || !healthGemini) {
      lastUpdateRef.current = now;
      
    const fetchOutfit = async () => {
      setOutfitLoading(true);
      try {
        const res = await generateResponse(
          'List 5 concise, separate clothing style tips for today based on the weather. Do NOT mention weather data, location, temperature, or greetings. Each tip should be a separate line, direct and relevant.',
          currentWeather
        );
        if (!cancelled) setOutfitGemini(res.text);
      } catch {
        if (!cancelled) setOutfitGemini('Unable to fetch outfit suggestions.');
      } finally {
        if (!cancelled) setOutfitLoading(false);
      }
    };
    const fetchHealth = async () => {
      setHealthLoading(true);
      try {
        const concernText = userHealthConcerns.length > 0 ? `User health concerns: ${userHealthConcerns.join(', ')}. ` : '';
        const res = await generateResponse(
          `${concernText}List 5 concise, separate health tips for today based on the weather. Do NOT mention weather data, location, temperature, or greetings. Each tip should be a separate line, direct and relevant.`,
          currentWeather
        );
        if (!cancelled) setHealthGemini(res.text);
      } catch {
        if (!cancelled) setHealthGemini('Unable to fetch health tips.');
      } finally {
        if (!cancelled) setHealthLoading(false);
      }
    };
    setOutfitGemini(null);
    setHealthGemini(null);
    fetchOutfit();
    fetchHealth();
    } else {
      console.log("HomeScreen - Skipping detailed tips update, using cached data");
    }
    return () => { cancelled = true; };
  }, [weatherSignature]);

  // Navigation handlers
  const handleSeeMoreDetails = () => {
    setActiveModal('details');
    setModalVisible(true);
  };

  const handleViewStyles = () => {
    setActiveModal('styles');
    setModalVisible(true);
  };

  const handleAdjustSchedule = () => {
    setActiveModal('schedule');
    setModalVisible(true);
  };

  const handleHealthTips = () => {
    setActiveModal('health');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  // Render different popup content based on activeModal
  const renderModalContent = () => {
    switch (activeModal) {
      case 'details':
        return (
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="weather-windy" size={adjust(18)} color="#4361EE" />
              <Text style={styles.modalTitle}>Weather Details</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={adjust(18)} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>
                Current temperature is {currentWeather?.temperature.toFixed(1)}°<Text>{currentWeather?.windSpeed ? ` with ${currentWeather?.windSpeed < 10 ? 'light' : 'strong'} wind (${currentWeather?.windSpeed.toFixed(1)}mph)` : ''}</Text>
              </Text>
              <View style={styles.modalItem}>
                <Feather name="droplet" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Humidity: {currentWeather?.humidity || 65}%</Text>
              </View>
              <View style={styles.modalItem}>
                <Feather name="thermometer" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Feels like: {currentWeather?.feelsLike.toFixed(1) || 74}°</Text>
              </View>
              <View style={styles.modalItem}>
                <MaterialCommunityIcons name="weather-sunset-up" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Sunrise: {currentWeather?.sunrise ? formatTime(currentWeather.sunrise) : '6:24 AM'}</Text>
              </View>
              <View style={styles.modalItem}>
                <MaterialCommunityIcons name="weather-sunset-down" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Sunset: {currentWeather?.sunset ? formatTime(currentWeather.sunset) : '8:15 PM'}</Text>
              </View>
            </View>
          </View>
        );
      case 'styles':
        return (
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="shirt-outline" size={adjust(18)} color="#4361EE" />
              <Text style={styles.modalTitle}>Outfit Styles</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={adjust(18)} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {outfitLoading ? (
                <ActivityIndicator size="small" color="#4361EE" />
              ) : (
                outfitGemini ? (
                  outfitGemini.split(/[.\n\r]+/).filter(Boolean).slice(0,5).map((tip, idx) => {
                    // Remove leading *, -, or whitespace
                    const cleanTip = tip.replace(/^\s*[*-]\s*/, '').trim();
                    return (
                      <View key={idx} style={styles.modalItem}>
                        {getOutfitTipIcon(cleanTip)}
                        <Text style={styles.modalItemText}>{cleanTip}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.modalText}>No suggestion available.</Text>
                )
              )}
            </View>
          </View>
        );
      case 'schedule':
        return (
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <FontAwesome5 name="running" size={adjust(18)} color="#4361EE" />
              <Text style={styles.modalTitle}>Schedule Adjustment</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={adjust(18)} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalText}>Suggested changes to your schedule:</Text>
              <View style={styles.modalItem}>
                <Ionicons name="time-outline" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Reschedule soccer to 7:00 PM</Text>
              </View>
              <View style={styles.modalItem}>
                <Ionicons name="sunny-outline" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Best time for outdoor run: 8:00 AM</Text>
              </View>
              <View style={styles.modalItem}>
                <MaterialCommunityIcons name="umbrella" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Bring umbrella between 6-7 PM</Text>
              </View>
              <View style={styles.modalItem}>
                <MaterialCommunityIcons name="shield-sun" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                <Text style={styles.modalItemText}>Apply sunscreen before 10 AM run</Text>
              </View>
            </View>
          </View>
        );
      case 'health':
        return (
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="alert-circle-outline" size={adjust(18)} color="#4361EE" />
              <Text style={styles.modalTitle}>Health Tips</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Ionicons name="close" size={adjust(18)} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              {healthLoading ? (
                <ActivityIndicator size="small" color="#4361EE" />
              ) : (
                healthGemini ? (
                  healthGemini.split(/[.\n\r]+/).filter(Boolean).slice(0,5).map((tip, idx) => {
                    // Remove leading *, -, or whitespace
                    const cleanTip = tip.replace(/^\s*[*-]\s*/, '').trim();
                    return (
                      <View key={idx} style={styles.modalItem}>
                        {getHealthTipIcon(cleanTip)}
                        <Text style={styles.modalItemText}>{cleanTip}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.modalText}>No health tips available.</Text>
                )
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  // Helper function to get proper high/low temperatures
  const getMinMaxTemps = () => {
    if (!currentWeather) return { high: '--', low: '--' };
    
    // If we have forecast data, extract the real min/max for today
    if (forecast && forecast.daily && forecast.daily.length > 0) {
      const todayForecast = forecast.daily[0];
      if (todayForecast.temperature.max !== todayForecast.temperature.min) {
        return {
          high: todayForecast.temperature.max.toFixed(0),
          low: todayForecast.temperature.min.toFixed(0)
        };
      }
    }
    
    // If min and max temps from current weather are the same or not meaningful,
    // create a range around the current temperature
    const baseTemp = currentWeather.temperature;
    const variation = Math.max(2, baseTemp * 0.1); // Use at least 2 degrees variation
    
    return {
      high: Math.round(baseTemp + variation).toString(),
      low: Math.round(baseTemp - variation).toString()
    };
  };

  const handleLocationPress = () => {
    navigation.navigate('Forecast', { 
      openCityModal: true,
      fromHomeScreen: true 
    });
  };

  if (isLoading && !currentWeather) {
    return (
      <View style={styles.safeArea}>
        <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
        <LinearGradient
          colors={['#b3d4ff', '#5c85e6']}
          style={[styles.background, styles.centerContent]}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading weather data...</Text>
          {error && (
            <Text style={styles.errorText}>{error.message}</Text>
          )}
        </LinearGradient>
      </View>
    );
  }

  // Determine weather description for info card
  const getWeatherDescription = () => {
    if (!currentWeather) return <Text style={styles.infoText}>Perfect weather for your 7 AM run</Text>;
    
    const temp = currentWeather.temperature;
    const windSpeed = currentWeather.windSpeed || 0;
    const description = currentWeather.description || '';
    const icon = currentWeather.icon || '';
    
    // Simple logic based on weather conditions
    if (temp < 10) return <Text style={styles.infoText}>It's cold today. Bundle up with a warm jacket!</Text>;
    if (temp > 30) return <Text style={styles.infoText}>It's hot out there! Stay hydrated and use sunscreen.</Text>;
    
    // Check the weather description/icon
    if (icon.startsWith('01')) return <Text style={styles.infoText}>It's a clear, beautiful day. Enjoy the sunshine!</Text>;
    if (description.includes('rain') || icon.startsWith('09') || icon.startsWith('10')) 
      return <Text style={styles.infoText}>It's rainy today. Don't forget your umbrella!</Text>;
    if (icon.startsWith('11')) return <Text style={styles.infoText}>Thunderstorms in the area. Stay indoors if possible.</Text>;
    if (icon.startsWith('13')) return <Text style={styles.infoText}>It's snowing! Bundle up and drive carefully.</Text>;
    if (icon.startsWith('50')) return <Text style={styles.infoText}>Foggy conditions. Take care when driving.</Text>;
    
    if (windSpeed > 15) return <Text style={styles.infoText}>It's chilly & windy today. Wear your favorite windbreaker & cap!</Text>;
    if (description.includes('cloud')) return <Text style={styles.infoText}>It's cloudy today, but mild. Light jacket recommended.</Text>;
    
    // Default description
    return <Text style={styles.infoText}>Pleasant weather today. Enjoy your day!</Text>;
  };

  return (
    <View style={styles.safeArea}>
      {/* <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" /> */}
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {/* Header with location */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.locationContainer}
              onPress={handleLocationPress}
            >
              <MaterialCommunityIcons name="map-marker" size={adjust(16)} color="#333" />
              <Text style={styles.headerLocationText}>
                {currentWeather?.location ? `${currentWeather.location}` : "Loading location..."}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weather Card */}
          <View style={styles.weatherCard}>
            {/* Weather Icon and Description - Top Right */}
            <View style={styles.weatherIconContainer}>
              {currentWeather?.icon ? (
                <MaterialCommunityIcons 
                  name={getWeatherIconMaterial(currentWeather.icon)} 
                  size={adjust(55)} 
                  color={getWeatherIconColor(currentWeather.icon)} 
                />
              ) : (
                <MaterialCommunityIcons 
                  name="weather-partly-cloudy" 
                  size={adjust(50)} 
                  color="#A9A9A9" 
                />
              )}
              <Text style={styles.weatherDescription}>
                {currentWeather?.description || "Loading..."}
              </Text>
            </View>

            {/* Current temperature */}
            <View style={styles.currentTemp}>
              <Text style={styles.tempValue}>
                {currentWeather?.temperature.toFixed(0) || '--'}°{tempUnit}
              </Text>
            </View>

            {/* Hi/Lo temperatures */}
            <View style={styles.tempMinMax}>
              <Text style={styles.tempRangeText}>
                Hi {getMinMaxTemps().high}° Lo {getMinMaxTemps().low}°
              </Text>
            </View>

            {/* Hourly forecast */}
            {forecast && forecast.hourly && forecast.hourly.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyForecastScroll}
              >
                {forecast.hourly.map((hour, index) => {
                  // Format the timestamp to get the hour
                  const date = new Date(hour.date * 1000);
                  const timeDisplay = index === 0 ? 'Now' : formatHour(hour.date);
                  
                  return (
                    <View key={`hour-${index}`} style={styles.hourBlock}>
                      <Text style={styles.hourText}>{timeDisplay}</Text>
                      <MaterialCommunityIcons 
                        name={getWeatherIconMaterial(hour.weather.icon)} 
                        size={adjust(16)} 
                        color={getWeatherIconColor(hour.weather.icon)} 
                      />
                      <Text style={styles.hourTemp}>{hour.temperature.day.toFixed(0)}°</Text>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.hourlyForecast}>
                <View style={styles.hourBlock}>
                  <Text style={styles.hourText}>--</Text>
                  <ActivityIndicator size="small" color="#4361EE" />
                  <Text style={styles.hourTemp}>--°</Text>
                </View>
              </View>
            )}
          </View>

          {/* Weather Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoContent}>
              <MaterialCommunityIcons 
                name="weather-windy" 
                size={adjust(18)} 
                color="#4361EE" 
                style={styles.infoIcon} 
              />
              <View style={styles.infoTextContainer}>
                {getWeatherDescription()}
                <Text style={styles.commuteText}>
                  {currentWeather?.location ? `Weather in ${currentWeather.location}, ${currentWeather.country}` : "Loading location data..."}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={handleSeeMoreDetails}
            >
              <Text style={styles.detailsButtonText}>See More Details</Text>
            </TouchableOpacity>
          </View>

          {/* Outfit Card */}
          <View style={styles.outfitCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="shirt-outline" size={adjust(16)} color="#4361EE" />
              <Text style={styles.cardTitle}>Today's Outfit</Text>
            </View>
            {outfitCardLoading ? (
              <ActivityIndicator size="small" color="#4361EE" />
            ) : (
              <Text style={styles.outfitText}>{outfitCardText}</Text>
            )}
            <TouchableOpacity 
              style={styles.outfitButton}
              onPress={handleViewStyles}
            >
              <Text style={styles.outfitButtonText}>View Styles</Text>
            </TouchableOpacity>
          </View>

          {/* Routine Card */}
          <View style={styles.routineCard}>
            <View style={styles.cardHeader}>
              <FontAwesome5 name="running" size={adjust(16)} color="#4361EE" />
              <Text style={styles.cardTitle}>Routine Suggestion</Text>
            </View>
            <Text style={styles.routineText}>{healthCardText}</Text>
            <TouchableOpacity 
              style={styles.routineButton}
              onPress={handleHealthTips}
            >
              <Text style={styles.routineButtonText}>View Health Tips</Text>
              </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
      {modalVisible && (
        <Modal
          visible={modalVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            {renderModalContent()}
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#b3d4ff',
  },
  background: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: adjust(8), // Reduced from 10
    fontSize: adjust(14), // Reduced from 16
  },
  errorText: {
    color: '#fff',
    marginTop: adjust(8), // Reduced from 10
    fontSize: adjust(14), // Reduced from 16
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: adjust(12), // Reduced from 20
    paddingBottom: adjust(16), // Reduced from 20
  },
  header: {
    marginTop: adjust(12), // Reduced from 10
    marginBottom: adjust(12), // Reduced from 15
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: adjust(10),
  },
  headerLocationText: {
    fontSize: adjust(14), // Reduced from 16
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(4), // Reduced from 5
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Reduced from 15
    padding: adjust(14), // Reduced from 16
    marginBottom: adjust(12), // Reduced from 14
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.08, // Reduced from 0.1
    shadowRadius: 3, // Reduced from 4
    elevation: 2, // Reduced from 3
    position: 'relative',
  },
  weatherIconContainer: {
    position: 'absolute',
    top: adjust(14), // Reduced from 16
    right: adjust(14), // Reduced from 16
    alignItems: 'center',
    marginTop: adjust(4), // Reduced from 5
  },
  weatherDescription: {
    fontSize: adjust(11), // Reduced from 12
    color: '#666',
    marginTop: adjust(3), // Reduced from 4
    textAlign: 'center',
  },
  currentTemp: {
    marginTop: adjust(6), // Reduced from 8
    marginBottom: adjust(3), // Reduced from 4
  },
  tempValue: {
    fontSize: adjust(40), // Reduced from 45
    fontWeight: '600',
    color: '#333',
  },
  tempMinMax: {
    marginBottom: adjust(14), // Reduced from 16
  },
  tempRangeText: {
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
  },
  hourlyForecastScroll: {
    paddingHorizontal: adjust(4), // Reduced from 5
    flexDirection: 'row',
  },
  hourlyForecast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: adjust(6), // Reduced from 8
    paddingHorizontal: adjust(4), // Reduced from 5
  },
  hourBlock: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: adjust(8), // Reduced from 10
    paddingVertical: adjust(6), // Reduced from 8
    paddingHorizontal: adjust(8), // Reduced from 10
    marginRight: adjust(8), // Reduced from 10
    minWidth: adjust(42), // Reduced from 48
  },
  hourText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#333',
    marginBottom: adjust(4), // Reduced from 6
    fontWeight: '500',
  },
  hourTemp: {
    fontSize: adjust(12), // Reduced from 14
    color: '#333',
    fontWeight: '600',
    marginTop: adjust(4), // Reduced from 6
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Reduced from 15
    padding: adjust(12), // Reduced from 14
    marginBottom: adjust(12), // Reduced from 14
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.08, // Reduced from 0.1
    shadowRadius: 3, // Reduced from 4
    elevation: 2, // Reduced from 3
  },
  infoContent: {
    flexDirection: 'row',
    marginBottom: adjust(10), // Reduced from 12
  },
  infoIcon: {
    marginRight: adjust(10), // Reduced from 12
    marginTop: adjust(2),
  },
  infoTextContainer: {
    flex: 1,
  },
  infoText: {
    fontSize: adjust(12), // Reduced from 13
    color: '#333',
    marginBottom: adjust(3), // Reduced from 4
    lineHeight: adjust(16), // Reduced from 18
  },
  commuteText: {
    fontSize: adjust(10), // Reduced from 11
    color: '#666',
    fontStyle: 'italic',
  },
  detailsButton: {
    backgroundColor: '#4974FF',
    borderRadius: adjust(8), // Reduced from 10
    paddingVertical: adjust(8), // Reduced from 10
    paddingHorizontal: adjust(18), // Reduced from 22
    alignSelf: 'center',
    width: '80%',
  },
  detailsButtonText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  outfitCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Reduced from 15
    padding: adjust(12), // Reduced from 14
    marginBottom: adjust(12), // Reduced from 14
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.08, // Reduced from 0.1
    shadowRadius: 3, // Reduced from 4
    elevation: 2, // Reduced from 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(8), // Reduced from 10
  },
  cardTitle: {
    fontSize: adjust(12), // Reduced from 13
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(6), // Reduced from 8
  },
  outfitText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#666',
    marginBottom: adjust(10), // Reduced from 12
    lineHeight: adjust(16), // Reduced from 18
  },
  outfitButton: {
    backgroundColor: '#f9d057',
    borderRadius: adjust(8), // Reduced from 10
    paddingVertical: adjust(8), // Reduced from 10
    paddingHorizontal: adjust(18), // Reduced from 22
    alignSelf: 'center',
    width: '80%',
  },
  outfitButtonText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  routineCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Reduced from 15
    padding: adjust(12), // Reduced from 14
    marginBottom: adjust(12), // Reduced from 14
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.08, // Reduced from 0.1
    shadowRadius: 3, // Reduced from 4
    elevation: 2, // Reduced from 3
  },
  routineText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#666',
    marginBottom: adjust(10), // Reduced from 12
    lineHeight: adjust(16), // Reduced from 18
  },
  routineButton: {
    backgroundColor: '#4974FF',
    borderRadius: adjust(8), // Reduced from 10
    paddingVertical: adjust(8), // Reduced from 10
    paddingHorizontal: adjust(18), // Reduced from 22
    alignSelf: 'center',
    width: '80%',
  },
  routineButtonText: {
    fontSize: adjust(11), // Reduced from 12
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Reduced from 15
    width: '85%',
    padding: adjust(16), // Reduced from 20
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.2, // Reduced from 0.25
    shadowRadius: 3, // Reduced from 3.84
    elevation: 4, // Reduced from 5
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12), // Reduced from 15
  },
  modalTitle: {
    fontSize: adjust(14), // Reduced from 16
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: adjust(8), // Reduced from 10
  },
  closeButton: {
    width: adjust(24), // Reduced from 28
    height: adjust(24), // Reduced from 28
    borderRadius: adjust(12), // Reduced from 14
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: adjust(4), // Reduced from 5
  },
  modalText: {
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
    marginBottom: adjust(12), // Reduced from 15
    lineHeight: adjust(18), // Reduced from 20
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(10), // Reduced from 12
  },
  modalItemIcon: {
    marginRight: adjust(6), // Reduced from 8
  },
  modalItemText: {
    flex: 1,
    color: '#333',
    fontSize: adjust(12), // Reduced from 14
    marginLeft: adjust(8), // Reduced from 10
    marginRight: adjust(8), // Reduced from 10
    textAlign: 'left',
    paddingVertical: adjust(3), // Reduced from 4
    paddingRight: adjust(6), // Reduced from 8
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingVertical: adjust(10), // Reduced from 12
  },
  locationText: {
    fontSize: adjust(16), // Reduced from 18
    color: '#333',
    marginLeft: adjust(6), // Reduced from 8
  },
});

export default HomeScreen;