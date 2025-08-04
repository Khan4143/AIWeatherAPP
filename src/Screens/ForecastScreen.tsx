import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  Image,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView as SafeAreaViewRN } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import adjust from '../utils/adjust';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../constants/dimesions';
import { StackNavigationProp } from '@react-navigation/stack';
import { useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { ForecastData, getMaterialWeatherIcon } from '../services/weatherService';
import { useWeatherContext } from '../contexts/WeatherContext';
import { UserData } from '../Screens/UserInfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import debounce from 'lodash/debounce';
import { UserDataManager } from '../utils/userDataManager';

type ForecastScreenProps = {
  navigation: StackNavigationProp<any>;
};

// Storage key for saved cities
const SAVED_CITIES_KEY = 'skylar_saved_cities';

interface CityObject { key: string; display: string; isDefault?: boolean; }

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyAJcSmb8jAEU5qVlzR3sTRcraWxb38B31w';

type RouteParams = {
  openCityModal?: boolean;
  fromHomeScreen?: boolean;
};

const ForecastScreen = ({ navigation }: ForecastScreenProps) => {
  const [selectedDay, setSelectedDay] = useState(0);
  const [citySearchModalVisible, setCitySearchModalVisible] = useState(false);
  const route = useRoute();
  const params = route.params as RouteParams;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use WeatherContext for current location and forecast
  const { forecast, isLoading: isLoadingWeather, error, fetchForecastForCity, preferredUnits } = useWeatherContext();
  const [location, setLocation] = useState<string | null>(null);

  // State for city search and management
  const [searchQuery, setSearchQuery] = useState('');
  const [savedCities, setSavedCities] = useState<CityObject[]>([]);
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);

  // When the forecast updates, update our displayed location
  useEffect(() => {
    if (forecast && forecast.location) {
      setLocation(forecast.location);
    }
  }, [forecast]);

  // Ensure we have weather data on initial load
  useEffect(() => {
    const userDataLocation = UserData.location;
    
    // If we don't have forecast data, but we do have a location, fetch it
    if (!forecast && !isLoadingWeather && userDataLocation) {
      fetchForecastForCity(userDataLocation);
    }
  }, [forecast, isLoadingWeather, fetchForecastForCity]);

  // Watch for changes to UserData.location
  useEffect(() => {
    const userDataLocation = UserData.location;
    if (userDataLocation) {
      // Update saved cities to reflect new default location
      const updatedCities = savedCities.map(city => ({
        ...city,
        isDefault: city.display === userDataLocation
      }));
      
      // If the default location isn't in the list, add it
      if (!updatedCities.some(city => city.display === userDataLocation)) {
        updatedCities.push({
          key: `default-${userDataLocation}-${Date.now()}`,
          display: userDataLocation,
          isDefault: true
        });
      }
      
      setSavedCities(updatedCities);
      saveCities(updatedCities);
    }
  }, [UserData.location]);

  // Use forecast as weatherData
  const weatherData: ForecastData | null = forecast;

  // Get current hour's forecast data
  const getCurrentHourForecast = () => {
    if (!weatherData?.hourly || weatherData.hourly.length === 0) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find the forecast entry for the current hour
    const currentHourForecast = weatherData.hourly.find(hour => {
      const hourDate = new Date(hour.date * 1000);
      return hourDate.getHours() === currentHour;
    });
    
    // If not found, return the first hour (closest to current time)
    return currentHourForecast || weatherData.hourly[0];
  };

  // Generate accurate weather description based on icon code
  const getAccurateWeatherDescription = (iconCode: string): string => {
    if (!iconCode) return 'Unknown weather';
    
    const conditionCode = iconCode.substring(0, 2);
    const isDayTime = iconCode.endsWith('d');
    
    switch(conditionCode) {
      case '01': // clear sky
        return isDayTime ? 'Clear sky' : 'Clear night';
      
      case '02': // few clouds
        return isDayTime ? 'Partly cloudy' : 'Partly cloudy night';
      
      case '03': // scattered clouds
        return isDayTime ? 'Scattered clouds' : 'Scattered clouds';
      
      case '04': // broken clouds
        return isDayTime ? 'Overcast' : 'Overcast';
      
      case '09': // shower rain
        return isDayTime ? 'Light rain showers' : 'Light rain showers';
      
      case '10': // rain
        return isDayTime ? 'Rain' : 'Rain';
      
      case '11': // thunderstorm
        return isDayTime ? 'Thunderstorm' : 'Thunderstorm';
      
      case '13': // snow
        return isDayTime ? 'Snow' : 'Snow';
      
      case '50': // mist/fog
        return isDayTime ? 'Mist' : 'Mist';
      
      default:
        return 'Unknown weather';
    }
  };

  // Get weather icon based on condition
  const getWeatherIcon = (iconCode: string): string => {
    console.log('Received weather icon code:', iconCode);
    if (!iconCode) return 'weather-cloudy';
    
    // Get the mapped icon
    const iconName = getMaterialWeatherIcon(iconCode);
    console.log('Mapped to icon:', iconName);
    return iconName;
  };

  // Get appropriate icon color based on weather condition
  const getWeatherIconColor = (iconCode: string): string => {
    if (!iconCode) return '#4361EE'; // Default color
    
    // Extract the condition code and day/night indicator
    const conditionCode = iconCode.substring(0, 2);
    const isDayTime = iconCode.endsWith('d');
    
    // Color mapping based on weather condition and time of day
    switch(conditionCode) {
      case '01': // clear sky
        return isDayTime ? '#FF9500' : '#3A4CA8'; // orange for day, navy for night
      
      case '02': // few clouds
        return isDayTime ? '#4361EE' : '#3A4CA8'; // app blue for day, darker blue for night
      
      case '03': // scattered clouds
      case '04': // broken clouds
        return isDayTime ? '#4361EE' : '#2B3990'; // app blue for day, darker blue for night
      
      case '09': // shower rain
        return isDayTime ? '#4361EE' : '#2B3990'; // app blue for day, darker blue for night
      
      case '10': // rain
        return isDayTime ? '#5D9CEC' : '#2B3990'; // lighter blue for day, darker blue for night
      
      case '11': // thunderstorm
        return isDayTime ? '#9370DB' : '#6A0DAD'; // medium purple for day, darker purple for night
      
      case '13': // snow
        return isDayTime ? '#5D9CEC' : '#2B3990'; // light blue for day, darker blue for night
      
      case '50': // mist/fog
        return isDayTime ? '#4361EE' : '#2B3990'; // app blue for day, darker blue for night
    }
    
    // Default fallback - use app's primary blue
    return '#4361EE';
  };

  // Format time from a date string
  const formatTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr);
      return format(date, 'h a'); // Example: "3 PM"
    } catch (e) {
      return timeStr;
    }
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return format(date, 'EEE, MMM d'); // Example: "Mon, Jan 1"
    } catch (e) {
      return dateStr;
    }
  };

  // Render the current day's detailed forecast
  const renderDetailedForecast = () => {
    if (!weatherData || isLoadingWeather) {
      return <ActivityIndicator size="large" color="#4361EE" />;
    }

    const currentForecast = weatherData.daily[selectedDay];
    const currentWeather = selectedDay === 0 ? weatherData.current : null;
    // For hourly forecast, use weatherData.hourly (first 24 hours for today, or filter by date for other days)
    let hourlyData = weatherData.hourly;
    if (selectedDay !== 0) {
      const selectedDate = new Date(currentForecast.date * 1000).getDate();
      hourlyData = weatherData.hourly.filter(h => new Date(h.date * 1000).getDate() === selectedDate);
    } else {
      hourlyData = weatherData.hourly.slice(0, 24); // Show 24 hourly entries for today
    }

    const tempUnit = preferredUnits === 'imperial' ? 'F' : 'C';

    return (
      <View style={styles.detailedForecastContainer}>
        <Text style={styles.dateHeader}>
          {selectedDay === 0 
            ? 'Today, ' + formatDate(new Date(currentForecast.date * 1000).toISOString())
            : formatDate(new Date(currentForecast.date * 1000).toISOString())}
        </Text>
        <View style={styles.currentConditionsContainer}>
          <View style={styles.temperatureContainer}>
            <Text style={styles.currentTemp}>
              {selectedDay === 0
                ? `${Math.round(currentWeather?.temperature || 0)}°${tempUnit}`
                : `${Math.round(currentForecast.temperature.max)}°${tempUnit}`}
            </Text>
            <Text style={styles.minMaxTemp}>
              {`${Math.round(currentForecast.temperature.max)}°/${Math.round(currentForecast.temperature.min)}°`}
            </Text>
          </View>
          <View style={styles.conditionContainer}>
            {(() => {
              if (selectedDay === 0) {
                // For today, use current hour's forecast data
                const currentHourData = getCurrentHourForecast();
                if (currentHourData) {
                  return (
                    <>
                      <MaterialCommunityIcons
                        name={getWeatherIcon(currentHourData.weather.icon)}
                        size={adjust(48)}
                        color={getWeatherIconColor(currentHourData.weather.icon)}
                      />
                      <Text style={styles.conditionText}>{getAccurateWeatherDescription(currentHourData.weather.icon)}</Text>
                    </>
                  );
                }
              }
              
              // For other days or fallback, use daily forecast data
              return (
                <>
                  <MaterialCommunityIcons
                    name={getWeatherIcon(currentForecast.weather.icon)}
                    size={adjust(48)}
                    color={getWeatherIconColor(currentForecast.weather.icon)}
                  />
                  <Text style={styles.conditionText}>{currentForecast.weather.description}</Text>
                </>
              );
            })()}
          </View>
        </View>
        {/* Horizontal scrollable weather details */}
        <Text style={styles.sectionTitle}>Hourly Forecast</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hourlyForecastContainer}
        >
          {hourlyData.map((hour, index) => (
            <View key={index} style={styles.hourlyForecastItem}>
              <Text style={styles.hourlyTime}>{formatTime(new Date(hour.date * 1000).toISOString())}</Text>
              <MaterialCommunityIcons
                name={getWeatherIcon(hour.weather.icon)}
                size={adjust(24)}
                color={getWeatherIconColor(hour.weather.icon)}
              />
              <Text style={styles.hourlyTemp}>{Math.round(hour.temperature.day)}°{tempUnit}</Text>
              <View style={styles.rainChanceContainer}>
                <MaterialCommunityIcons name="water" size={adjust(12)} color="#5D9CEC" />
                <Text style={styles.rainChanceText}>{Math.round((hour.pop || 0) * 100)}%</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Additional weather details */}
        <Text style={styles.sectionTitle}>Weather Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weather-windy" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>Wind</Text>
            <Text style={styles.detailValue}>
              {selectedDay === 0
                ? `${currentWeather?.windSpeed} ${preferredUnits === 'imperial' ? 'mph' : 'km/h'}`
                : `${currentForecast.windSpeed} ${preferredUnits === 'imperial' ? 'mph' : 'km/h'}`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="water-percent" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>Humidity</Text>
            <Text style={styles.detailValue}>
              {selectedDay === 0
                ? `${currentWeather?.humidity}%`
                : `${currentForecast.humidity}%`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weather-sunset-up" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>Sunrise</Text>
            <Text style={styles.detailValue}>{new Date(currentForecast.sunrise * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weather-sunset-down" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>Sunset</Text>
            <Text style={styles.detailValue}>{new Date(currentForecast.sunset * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="sunglasses" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>UV Index</Text>
            <Text style={styles.detailValue}>{currentForecast.uvi}</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="weather-rainy" size={adjust(20)} color="#4361EE" />
            <Text style={styles.detailLabel}>Rain Chance</Text>
            <Text style={styles.detailValue}>{Math.round((currentForecast.pop || 0) * 100)}%</Text>
          </View>
        </View>
      </View>
    );
  };

  // Load saved cities on mount
  useEffect(() => {
    loadSavedCities();
  }, []);

  // Load saved cities from storage
  const loadSavedCities = async () => {
    try {
      const savedCitiesJson = await AsyncStorage.getItem(SAVED_CITIES_KEY);
      if (savedCitiesJson) {
        const cities = JSON.parse(savedCitiesJson);
        // Update isDefault flag based on UserData.location
        const updatedCities = cities.map((city: CityObject) => ({
          ...city,
          isDefault: city.display === UserData.location
        }));
        setSavedCities(updatedCities);
        saveCities(updatedCities); // Save the updated cities back to storage
      } else if (UserData.location) {
        // If no saved cities but we have a default location, add it
        const defaultCity: CityObject = {
          key: `default-${UserData.location}-${Date.now()}`,
          display: UserData.location,
          isDefault: true
        };
        setSavedCities([defaultCity]);
        saveCities([defaultCity]);
      }
    } catch (error) {
      console.error('Error loading saved cities:', error);
    }
  };

  // Save cities to storage
  const saveCities = async (cities: CityObject[]) => {
    try {
      await AsyncStorage.setItem(SAVED_CITIES_KEY, JSON.stringify(cities));
    } catch (error) {
      console.error('Error saving cities:', error);
    }
  };

  // Remove a saved city
  const removeSavedCity = useCallback((cityKey: string) => {
    const cityToRemove = savedCities.find(city => city.key === cityKey);
    if (cityToRemove?.isDefault) {
      Alert.alert(
        "Can't Remove Default Location",
        "This is your default location set in your profile. You can change it in the Settings screen.",
        [{ text: 'OK' }]
      );
      return;
    }
    
    const updatedCities = savedCities.filter(city => city.key !== cityKey);
    setSavedCities(updatedCities);
    saveCities(updatedCities);
  }, [savedCities, saveCities]);

  // Fetch from Google Places API
  const searchPlaces = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setPlacesResults([]);
      return;
    }
    
    try {
      setIsPlacesLoading(true);
      
      // Clear any previous results
      setPlacesResults([]);
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=(cities)&key=${GOOGLE_PLACES_API_KEY}`;
      console.log('Request URL (without API key):', url.replace(GOOGLE_PLACES_API_KEY, 'API_KEY'));
      
      const response = await fetch(url);
      console.log('Places API Response Status:', response.status);
      console.log('Places API Response Status Text:', response.statusText);
      
      const data = await response.json();
      console.log('Places API Response:', data);
      
      if (data.error) {
        console.error('Places API Error:', {
          code: data.error.code,
          message: data.error.message,
          status: data.error.status,
          details: data.error.details
        });
        return;
      }
      
      if (data.status === 'OK' && data.predictions) {
        const formattedResults = data.predictions.map((prediction: any) => ({
          place_id: prediction.place_id,
          description: prediction.description,
          structured_formatting: {
            main_text: prediction.structured_formatting.main_text,
            secondary_text: prediction.structured_formatting.secondary_text
          }
        }));
        
        setPlacesResults(formattedResults);
      } else if (data.status === 'REQUEST_DENIED') {
        console.error('REQUEST_DENIED - Common causes:');
        console.error('1. Places API not enabled in Google Cloud Console');
        console.error('2. Invalid API key');
        console.error('3. Billing not enabled');
        console.error('4. API key restrictions preventing access');
      }
      
    } catch (error) {
      console.error('Error in searchPlaces:', error);
    } finally {
      setIsPlacesLoading(false);
    }
  }, []);
  
  // Debounced search handler
  const debouncedSearchPlaces = useCallback(
    debounce((query: string) => {
      searchPlaces(query);
    }, 300),
    [searchPlaces]
  );
  
  // Handle text input change
  const handleSearchInputChange = (text: string) => {
    setSearchQuery(text);
    
    if (text.length < 2) {
      setPlacesResults([]);
    } else {
      debouncedSearchPlaces(text);
    }
  };
  
  // Handle place selection
  const handlePlaceSelected = async (placeId: string, description: string) => {
    try {
      // Get detailed place information
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_address,name&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch place details');
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        const cityName = data.result.name;
        const formattedAddress = data.result.formatted_address;
        
        // Create city object
        const cityObj: CityObject = {
          key: `${placeId}-${Date.now()}`,
          display: formattedAddress || description,
          isDefault: false
        };
        
        // Process the selected city
        selectCity(cityObj);
        
        // Clear search
        setSearchQuery('');
        setPlacesResults([]);
      }
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  // Select a city to display weather for
  const selectCity = useCallback((city: CityObject) => {
    // Update the UserData location directly
    UserData.location = city.display;
    
    // Update local state for UI
    setLocation(city.display);
    
    // Fetch forecast for the selected city
    fetchForecastForCity(city.display);
    
    // Save to persistent storage via UserDataManager
    UserDataManager.saveUserProfile();
    
    // If this isn't a saved city yet, add it
    const isSaved = savedCities.some(savedCity => savedCity.display === city.display);
    if (!isSaved) {
      // Check if this is the default location from UserData
      const isDefaultLocation = city.display === UserData.location;
      const updatedCities = [...savedCities, { ...city, isDefault: isDefaultLocation }];
      setSavedCities(updatedCities);
      saveCities(updatedCities);
    }
    
    // Close the modal and handle navigation
    setCitySearchModalVisible(false);
    if (params?.fromHomeScreen) {
      navigation.goBack();
    }
  }, [fetchForecastForCity, savedCities, saveCities, navigation, params?.fromHomeScreen]);

  // Add a city to saved cities
  const addCity = useCallback((city: CityObject) => {
    if (!savedCities.some(savedCity => savedCity.display === city.display)) {
      const updatedCities = [...savedCities, { ...city, isDefault: false }];
      setSavedCities(updatedCities);
      saveCities(updatedCities);
      
      // Select the city after adding it
      selectCity(city);
    }
  }, [savedCities, saveCities, selectCity]);

  // Toggle the city search modal
  const toggleCitySearchModal = () => {
    setCitySearchModalVisible(!citySearchModalVisible);
    // If closing modal and we came from HomeScreen, navigate back
    if (citySearchModalVisible && params?.fromHomeScreen) {
      navigation.goBack();
    }
    if (!citySearchModalVisible) {
      setSearchQuery('');
      setPlacesResults([]);
    }
  };

  // Effect to handle modal opening from route params
  useEffect(() => {
    if (params?.openCityModal) {
      setCitySearchModalVisible(true);
    }
  }, [params?.openCityModal]);

  // Add refresh handler
  const handleRefresh = async () => {
    if (isRefreshing) return; // Prevent multiple refreshes
    
    setIsRefreshing(true);
    try {
      const userDataLocation = UserData.location;
      if (userDataLocation) {
        await fetchForecastForCity(userDataLocation);
      }
    } catch (error) {
      console.error('Error refreshing forecast:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!weatherData && isLoadingWeather) {
    return (
      <LinearGradient colors={['#b3d4ff', '#4361EE']} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
        <SafeAreaViewRN style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading weather data...</Text>
            {error && (
              <Text style={styles.errorText}>{error.message}</Text>
            )}
          </View>
        </SafeAreaViewRN>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#b3d4ff', '#4361EE']} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}>
      <View style={{ flex: 1, paddingBottom: adjust(40) }}>
        {/* Header with location */}
        <View style={styles.header}>
          <View style={styles.locationContainer}>
            <TouchableOpacity
              style={styles.locationButton}
              onPress={toggleCitySearchModal}
            >
              <Ionicons name="location" size={adjust(16)} color="#4361EE" />
              <Text style={styles.locationText} numberOfLines={1}>
                {location || 'Select Location'}
              </Text>
              <Ionicons name="chevron-down" size={adjust(16)} color="#4361EE" />
            </TouchableOpacity>

            {/* Add refresh button */}
            <TouchableOpacity
              style={[
                styles.refreshButton,
                isRefreshing && styles.refreshButtonDisabled
              ]}
              onPress={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color="#4361EE" />
              ) : (
                <Ionicons 
                  name="refresh" 
                  size={adjust(20)} 
                  color="#4361EE" 
                />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.addCityButton}
            onPress={toggleCitySearchModal} 
          >
            <Ionicons name="add" size={adjust(24)} color="#4361EE" />
          </TouchableOpacity>
        </View>

        {/* Main scrollable content */}
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* 5-Day forecast cards */}
          <View style={styles.forecastCardsContainer}>
            <Text style={styles.forecastCardsTitle}>5-Day Forecast</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.forecastDaysScrollContent}
              style={styles.forecastDaysScroll}
            >
              {weatherData?.daily.slice(0, 5).map((day, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.forecastDayCard,
                    selectedDay === index && styles.selectedDayCard,
                  ]}
                  onPress={() => setSelectedDay(index)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.forecastDayText,
                      selectedDay === index && styles.selectedDayText,
                    ]}
                  >
                    {index === 0 ? 'Today' : format(new Date(day.date * 1000), 'EEE')}
                  </Text>
                  <MaterialCommunityIcons
                    name={getWeatherIcon(day.weather.icon)}
                    size={adjust(28)}
                    color={selectedDay === index ? '#FFF' : getWeatherIconColor(day.weather.icon)}
                    style={{ marginVertical: adjust(2) }}
                  />
                  <Text
                    style={[
                      styles.forecastDayTemp,
                      selectedDay === index && styles.selectedDayText,
                    ]}
                  >
                    {Math.round(day.temperature.max)}°/{Math.round(day.temperature.min)}°
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.spacer} />
          {/* Detailed forecast for the selected day */}
          {renderDetailedForecast()}
          <View style={styles.spacer} />
        </ScrollView>
      </View>
      
      {/* City Search Modal */}
      <Modal
        visible={citySearchModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={toggleCitySearchModal}
      >
        <LinearGradient
          colors={['#b3d4ff', '#5c85e6']}
          style={{flex: 1}}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{flex: 1}}
          >
            <SafeAreaViewRN style={styles.cityModalContainer}>
              {/* Header */}
              <View style={styles.modalHeaderContainer}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.cityModalTitle}>Search & Manage Cities</Text>
                </View>
                <TouchableOpacity 
                  onPress={toggleCitySearchModal}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={adjust(20)} color="#333" />
                </TouchableOpacity>
              </View>
              
              {/* City Search Input */}
              <View style={styles.citySearchInputContainer}>
                <Ionicons name="search" size={adjust(20)} color="#666" style={styles.citySearchIcon} />
                <TextInput
                  style={styles.citySearchInput}
                  placeholder="Search for a city..."
                  placeholderTextColor="#999"
                  value={searchQuery}
                  onChangeText={handleSearchInputChange}
                  returnKeyType="search"
                  autoCapitalize="words"
                  autoComplete="off"
                />
              </View>
              
              {/* City Search Results */}
              {searchQuery.length > 0 && (
                <View style={styles.citySuggestionsContainer}>
                  {isPlacesLoading ? (
                    <View style={styles.cityLoadingContainer}>
                      <ActivityIndicator size="small" color="#4361EE" />
                      <Text style={styles.cityLoadingText}>Searching cities...</Text>
                    </View>
                  ) : placesResults.length > 0 ? (
                    <View style={styles.suggestionsCard}>
                      <FlatList
                        data={placesResults}
                        keyExtractor={(item) => item.place_id}
                        renderItem={({ item }) => (
                          <TouchableOpacity 
                            style={styles.citySuggestionItem}
                            onPress={() => handlePlaceSelected(item.place_id, item.description)}
                          >
                            <View style={styles.citySuggestionTextContainer}>
                              <Ionicons name="location-outline" size={adjust(16)} color="#4361EE" />
                              <View style={styles.cityTextWrapper}>
                                <Text style={styles.cityMainText}>
                                  {item.structured_formatting?.main_text || item.description.split(',')[0]}
                                </Text>
                                {(item.structured_formatting?.secondary_text || item.description.includes(',')) && (
                                  <Text style={styles.citySecondaryText}>
                                    {item.structured_formatting?.secondary_text || 
                                     item.description.split(',').slice(1).join(',').trim()}
                                  </Text>
                                )}
                              </View>
                            </View>
                            <TouchableOpacity 
                              style={styles.addCityIcon}
                              onPress={(e) => {
                                e.stopPropagation();
                                const parts = item.description.split(',').map((part: string) => part.trim());
                                const city = parts[0];
                                const countryCode = parts.length > 1 ? parts[parts.length - 1] : '';
                                const cityObj: CityObject = {
                                  key: `${city}-${countryCode}-${Date.now()}`,
                                  display: item.description,
                                  isDefault: false
                                };
                                addCity(cityObj);
                              }}
                            >
                              <Ionicons name="add-circle" size={adjust(22)} color="#4361EE" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        )}
                        style={styles.citySuggestionsList}
                      />
                    </View>
                  ) : (
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>No cities found</Text>
                    </View>
                  )}
                </View>
              )}
              
              {/* Saved Cities Section */}
              <View style={styles.savedCitiesSection}>
                <Text style={styles.savedCitiesTitle}>Saved Cities</Text>
                <View style={styles.savedCitiesList}>
                  {savedCities.length === 0 ? (
                    <Text style={styles.noSavedCitiesText}>
                      No saved cities yet. Search for a city and tap the + icon to save it.
                    </Text>
                  ) : (
                    <FlatList
                      data={savedCities}
                      keyExtractor={(item) => item.key}
                      renderItem={({ item }) => (
                        <View style={styles.savedCityItem}>
                          <TouchableOpacity 
                            style={styles.savedCityTextContainer}
                            onPress={() => selectCity(item)}
                          >
                            <Ionicons 
                              name={item.isDefault ? "location" : "location-outline"} 
                              size={adjust(16)} 
                              color="#4361EE" 
                            />
                            <Text style={styles.savedCityText}>{item.display}</Text>
                          </TouchableOpacity>
                          {!item.isDefault && (
                            <TouchableOpacity 
                              onPress={() => removeSavedCity(item.key)}
                              style={styles.removeCityButton}
                            >
                              <Ionicons name="close-circle" size={adjust(20)} color="#FF6B6B" />
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    />
                  )}
                </View>
              </View>
            </SafeAreaViewRN>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: adjust(12),
    paddingBottom: adjust(80), // Add padding for tab bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: adjust(8), // Reduced from 10
    fontSize: adjust(14), // Reduced from 16
    color: '#fff',
  },
  errorText: {
    marginTop: adjust(10), // Reduced from 12
    fontSize: adjust(12), // Reduced from 14
    color: '#FF6B6B',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: adjust(12), // Reduced from 16
    paddingVertical: adjust(6), // Reduced from 8
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: adjust(15),
    width: '100%',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(20),
    paddingHorizontal: adjust(12),
    paddingVertical: adjust(6),
    flex: 1,
    marginRight: adjust(10),
  },
  locationText: {
    fontSize: adjust(12),
    color: '#333',
    marginHorizontal: adjust(8),
    flex: 1,
  },
  refreshButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  refreshButtonDisabled: {
    opacity: 0.7,
  },
  addCityButton: {
    padding: adjust(4), // Added padding for touch target
  },
  forecastDayCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(10), // Reduced from 12
    paddingVertical: adjust(10), // Reduced from 12
    paddingHorizontal: adjust(12), // Reduced from 16
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced shadow
    shadowOpacity: 0.08,
    shadowRadius: 2, // Reduced from 3
    elevation: 2,
  },
  selectedDayCard: {
    backgroundColor: '#4361EE',
    shadowOpacity: 0.15, // Reduced from 0.18
  },
  forecastDayText: {
    fontSize: adjust(11), // Reduced from 12
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(4), // Reduced from 5
  },
  selectedDayText: {
    color: 'white',
  },
  forecastDayTemp: {
    fontSize: adjust(11), // Reduced from 12
    fontWeight: '500',
    color: '#333',
    marginTop: adjust(4), // Reduced from 5
  },
  detailedForecastContainer: {
    backgroundColor: 'white',
    borderRadius: adjust(14), // Reduced from 16
    marginHorizontal: adjust(0),
    marginBottom: adjust(0),
  },
  dateHeader: {
    fontSize: adjust(16), // Reduced from 18
    fontWeight: '600',
    color: '#333',
    paddingTop: adjust(14), // Reduced from 16
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingBottom: adjust(10), // Reduced from 12
  },
  currentConditionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingBottom: adjust(14), // Reduced from 16
  },
  temperatureContainer: {
    flex: 1,
  },
  currentTemp: {
    fontSize: adjust(32), // Reduced from 36
    fontWeight: '700',
    color: '#333',
  },
  minMaxTemp: {
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
    marginTop: adjust(4),
  },
  conditionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionText: {
    fontSize: adjust(12), // Reduced from 14
    color: '#333',
    textAlign: 'center',
    marginTop: adjust(6), // Reduced from 8
  },
  sectionTitle: {
    fontSize: adjust(14), // Reduced from 16
    fontWeight: '600',
    color: '#333',
    paddingTop: adjust(14), // Reduced from 16
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingBottom: adjust(10), // Reduced from 12
  },
  hourlyForecastContainer: {
    paddingBottom: adjust(14), // Reduced from 16
    paddingHorizontal: adjust(14), // Reduced from 16
  },
  hourlyForecastItem: {
    alignItems: 'center',
    marginRight: adjust(16), // Reduced from 20
    width: adjust(36), // Reduced from 40
  },
  hourlyTime: {
    fontSize: adjust(11), // Reduced from 12
    color: '#666',
    marginBottom: adjust(4), // Reduced from 5
  },
  hourlyTemp: {
    fontSize: adjust(12), // Reduced from 14
    fontWeight: '500',
    color: '#333',
    marginVertical: adjust(4), // Reduced from 5
  },
  rainChanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rainChanceText: {
    fontSize: adjust(10), // Reduced from 12
    color: '#5D9CEC',
    marginLeft: adjust(2),
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: adjust(6), // Reduced from 8
    marginRight: adjust(8), // Reduced from 10
    marginLeft: adjust(8), // Reduced from 10
  },
  detailItem: {
    width: '48%',
    backgroundColor: 'rgba(67, 97, 238, 0.05)',
    borderRadius: adjust(10), // Reduced from 12
    padding: adjust(10), // Reduced from 12
    marginBottom: adjust(8), // Reduced from 10
    alignItems: 'flex-start',
  },
  detailLabel: {
    fontSize: adjust(11), // Reduced from 12
    color: '#666',
    marginTop: adjust(3), // Reduced from 4
  },
  detailValue: {
    fontSize: adjust(12), // Reduced from 14
    fontWeight: '500',
    color: '#333',
    marginTop: adjust(2),
  },
  spacer: {
    height: adjust(20), // Reduced from 40
  },
  forecastCardsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: adjust(14), // Reduced from 16
    marginTop: adjust(10), // Reduced from 12
    marginBottom: adjust(0),
    marginHorizontal: adjust(0),
  },
  forecastCardsTitle: {
    fontSize: adjust(16), // Reduced from 18
    fontWeight: '600',
    color: '#333',
    paddingTop: adjust(14), // Reduced from 16
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingBottom: adjust(10), // Reduced from 12
  },
  forecastDaysScroll: {
    paddingBottom: adjust(14), // Reduced from 16
  },
  forecastDaysScrollContent: {
    paddingHorizontal: adjust(14), // Reduced from 16
    gap: adjust(10), // Reduced from 12
  },
  cityModalContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: adjust(14), // Reduced from 16
    paddingTop: adjust(14), // Reduced from 16
    paddingBottom: adjust(10), // Reduced from 12
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityModalTitle: {
    fontSize: adjust(16), // Reduced from 18
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: adjust(6), // Reduced from 8
    borderRadius: adjust(16), // Reduced from 20
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    marginLeft: adjust(10), // Reduced from 12
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  citySearchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(8), // Reduced from 10
    margin: adjust(14), // Reduced from 16
    marginBottom: adjust(6), // Reduced from 8
    padding: adjust(10), // Reduced from 12
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2, // Reduced from 3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.1,
    shadowRadius: 2, // Reduced from 3
  },
  citySearchIcon: {
    marginRight: adjust(8), // Reduced from 10
    marginLeft: adjust(4), // Reduced from 5
    color: '#4361EE',
  },
  citySearchInput: {
    flex: 1,
    fontSize: adjust(14), // Reduced from 16
    color: '#333',
    padding: adjust(2), // Reduced from 4
  },
  citySuggestionsContainer: {
    margin: adjust(14), // Reduced from 16
    marginTop: adjust(3), // Reduced from 4
    marginBottom: adjust(6), // Reduced from 8
    maxHeight: SCREEN_HEIGHT * 0.3,
  },
  suggestionsCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(8), // Reduced from 10
    padding: adjust(6), // Reduced from 8
    elevation: 2, // Reduced from 3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.1,
    shadowRadius: 2, // Reduced from 3
    overflow: 'hidden',
  },
  cityLoadingContainer: {
    padding: adjust(14), // Reduced from 16
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: adjust(8), // Reduced from 10
    elevation: 2, // Reduced from 3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.1,
    shadowRadius: 2, // Reduced from 3
  },
  cityLoadingText: {
    marginLeft: adjust(8), // Reduced from 10
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
  },
  noResultsContainer: {
    padding: adjust(14), // Reduced from 16
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(8), // Reduced from 10
    elevation: 2, // Reduced from 3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.1,
    shadowRadius: 2, // Reduced from 3
  },
  noResultsText: {
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
  },
  citySuggestionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: adjust(10), // Reduced from 12
    paddingHorizontal: adjust(10), // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  citySuggestionTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityTextWrapper: {
    flex: 1,
    marginLeft: adjust(6), // Reduced from 8
    justifyContent: 'center',
  },
  cityMainText: {
    fontSize: adjust(14), // Reduced from 16
    fontWeight: '500',
    color: '#333',
  },
  citySecondaryText: {
    fontSize: adjust(11), // Reduced from 13
    color: '#666',
    marginTop: adjust(2),
  },
  addCityIcon: {
    padding: adjust(6), // Reduced from 8
  },
  savedCitiesSection: {
    margin: adjust(14), // Reduced from 16
    marginTop: adjust(6), // Reduced from 8
    marginBottom: adjust(20), // Reduced from 24
    backgroundColor: '#fff',
    borderRadius: adjust(8), // Reduced from 10
    overflow: 'hidden',
    elevation: 2, // Reduced from 3
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Reduced from 2
    shadowOpacity: 0.1,
    shadowRadius: 2, // Reduced from 3
  },
  savedCitiesTitle: {
    fontSize: adjust(16), // Reduced from 18
    fontWeight: '600',
    color: '#333',
    padding: adjust(14), // Reduced from 16
    paddingBottom: adjust(10), // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  savedCitiesList: {
    padding: adjust(3), // Reduced from 4
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  savedCityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: adjust(10), // Reduced from 12
    paddingHorizontal: adjust(10), // Reduced from 12
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  savedCityTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  savedCityText: {
    fontSize: adjust(14), // Reduced from 16
    color: '#333',
    marginLeft: adjust(6), // Reduced from 8
  },
  noSavedCitiesText: {
    fontSize: adjust(12), // Reduced from 14
    color: '#666',
    textAlign: 'center',
    padding: adjust(14), // Reduced from 16
  },
  removeCityButton: {
    padding: adjust(4), // Added padding for touch target
  },
  citySuggestionsList: {
    marginTop: adjust(0),
  },
  googlePlacesContainer: {
    marginHorizontal: adjust(14), // Reduced from 16
    marginTop: adjust(6), // Reduced from 8
    marginBottom: adjust(14), // Reduced from 16
    zIndex: 10,
  },
  googleSearchIcon: {
    marginLeft: adjust(8), // Reduced from 10
    marginRight: adjust(4), // Reduced from 5
  },
  background: {
    flex: 1,
  },
});

export default ForecastScreen; 