import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  FlatList,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import adjust from '../utils/adjust';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants/dimesions';
import { useWeatherContext } from '../contexts/WeatherContext';
import { format } from 'date-fns';
import { generateResponse } from '../services/openaiService';
import { requestNotificationPermission } from '../Notifications/UseNotification';
import { scheduleEventNotification, cancelEventNotification, updateEventNotification } from '../Notifications/EventNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMaterialWeatherIcon, validateRainProbability } from '../services/weatherService';
import { StackNavigationProp } from '@react-navigation/stack';
import NativeAdComponent from '../components/NativeAdComponent';
import { useAdMob } from '../contexts/AdContext';

// Planned event type
interface PlannedEvent {
  id: string;
  activity: string;
  description: string;
  date: string;
  time: string;
  duration: string;
}

// Add these interfaces at the top of the file, after existing interfaces
interface WeatherHourlyData {
  date: number;
  temperature: {
    day: number;
    min?: number;
    max?: number;
    night?: number;
    eve?: number;
    morn?: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  };
  pop?: number; // Probability of precipitation
  windSpeed: number;
  humidity: number;
}

interface WeatherDailyData {
  date: number;
  temperature: {
    day: number;
    min: number;
    max: number;
    night: number;
    eve: number;
    morn: number;
  };
  weather: {
    id: number;
    main: string;
    description: string;
    icon: string;
  };
  sunrise: number;
  sunset: number;
}

interface WeatherTimeData {
  daily: WeatherDailyData;
  hourly: WeatherHourlyData;
  selectedTime: number;
}

const PlanningScreen = ({ navigation }: { navigation: StackNavigationProp<any> }) => {
  // State for selected activity, date, time, and duration
  const [selectedActivity, setSelectedActivity] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('1 hour');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showCustomTime, setShowCustomTime] = useState(false);
  const [customHours, setCustomHours] = useState('1');
  const [customMinutes, setCustomMinutes] = useState('0');
  const [eventDescription, setEventDescription] = useState('');
  const [plannedEvents, setPlannedEvents] = useState<PlannedEvent[]>([]);
  const [previousDuration, setPreviousDuration] = useState('1 hour');
  
  // Initialize selectedDate with current date
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `Today, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  });

  // Initialize selectedTime with current hour rounded to nearest hour
  const [selectedTime, setSelectedTime] = useState(() => {
    const now = new Date();
    const hour = now.getHours();
    return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
  });
  
  // For tracking format updates
  const [formattingComplete, setFormattingComplete] = useState(false);
  
  // Weather recommendation state
  const [showWeatherRecommendation, setShowWeatherRecommendation] = useState(false);
  const [weatherRecommendation, setWeatherRecommendation] = useState<string>('');
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendedTimes, setRecommendedTimes] = useState<string[]>([]);
  
  // Get weather data from context
  const { forecast, currentWeather, isLoading: isLoadingWeather, preferredUnits } = useWeatherContext();
  const { initialized } = useAdMob();

  // Get appropriate icon color based on weather condition (same as ForecastScreen)
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
  
  // Activity options
  const activities = [
    { id: '1', name: 'Jogging', icon: 'run', iconType: 'MaterialCommunityIcons' },
    { id: '2', name: 'Picnic', icon: 'food-bank', iconType: 'MaterialIcons' },
    { id: '3', name: 'Hiking', icon: 'hiking', iconType: 'FontAwesome5' },
    { id: '4', name: 'BBQ', icon: 'grill', iconType: 'MaterialCommunityIcons' },
    { id: '5', name: 'Beach', icon: 'beach', iconType: 'MaterialCommunityIcons' },
    { id: '6', name: 'Outdoor Party', icon: 'celebration', iconType: 'MaterialIcons' },
    { id: '7', name: 'Camping', icon: 'campground', iconType: 'FontAwesome5' },
    { id: '8', name: 'Sports', icon: 'sports', iconType: 'MaterialIcons' },
  ];
  
  // Weather forecast data - now dynamically generated from actual forecast when available
  const forecastData = useMemo(() => {
    if (!forecast || !forecast.hourly || forecast.hourly.length < 4) {
      // Return placeholder data if forecast isn't available
      return [
        { id: '1', time: '2 PM', temp: '24°', icon: 'sunny-outline' },
        { id: '2', time: '3 PM', temp: '23°', icon: 'cloudy-outline' },
        { id: '3', time: '4 PM', temp: '22°', icon: 'cloud' },
        { id: '4', time: '5 PM', temp: '21°', icon: 'rainy-outline' },
      ];
    }

    const tempUnit = preferredUnits === 'imperial' ? 'F' : 'C';

    // Convert forecast data to the format we need - show 24 hourly entries
    return forecast.hourly.slice(0, 24).map((hourData, index) => {
      const time = format(new Date(hourData.date * 1000), 'h a');
      const temp = Math.round(hourData.temperature.day) + '°' + tempUnit;
      
      // Get weather icon using the same system as ForecastScreen
      const icon = getMaterialWeatherIcon(hourData.weather.icon);
      
      return {
        id: index.toString(),
        time,
        temp,
        icon,
        condition: hourData.weather.description,
        pop: hourData.pop || 0, // Probability of precipitation
        wind: hourData.windSpeed,
        humidity: hourData.humidity
      };
    });
  }, [forecast, preferredUnits]); // Add preferredUnits to dependencies

  // State for date and time
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState(4);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isAM, setIsAM] = useState(false);

  // Function to render activity icon based on type
  const renderActivityIcon = (item: any) => {
    switch (item.iconType) {
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon} size={adjust(16)} color="#333" />;
      case 'MaterialIcons':
        return <MaterialIcons name={item.icon} size={adjust(16)} color="#333" />;
      case 'FontAwesome5':
        return <FontAwesome5 name={item.icon} size={adjust(14)} color="#333" />;
      default:
        return <Ionicons name="help-outline" size={adjust(16)} color="#333" />;
    }
  };

  // Add these state variables for editing events
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<PlannedEvent | null>(null);

  // Add these functions for persisting events
  const savePlannedEvents = async (events: PlannedEvent[]) => {
    try {
      await AsyncStorage.setItem('plannedEvents', JSON.stringify(events));
      console.log('✅ Saved planned events to storage');
    } catch (error) {
      console.error('❌ Failed to save planned events:', error);
    }
  };

  const loadPlannedEvents = async () => {
    try {
      const eventsJson = await AsyncStorage.getItem('plannedEvents');
      if (eventsJson) {
        const events = JSON.parse(eventsJson) as PlannedEvent[];
        console.log(`✅ Loaded ${events.length} planned events from storage`);
        return events;
      }
    } catch (error) {
      console.error('❌ Failed to load planned events:', error);
    }
    return [];
  };

  // Handle confirming an event
  const handleConfirmEvent = async () => {
    // Check if an activity is selected
    if (!selectedActivity) {
      Alert.alert('Missing Information', 'Please select an activity first');
      return;
    }

    // Check if description is provided
    if (!eventDescription.trim()) {
      Alert.alert('Missing Information', 'Please enter a description for your event');
      return;
    }

    const selectedActivityObj = activities.find(activity => activity.id === selectedActivity);
      
    // If we're not editing, check for time conflicts
    if (!isEditingEvent) {
      // Check if there's already an event at the same time
      const eventExists = plannedEvents.some(
        event => event.date === selectedDate && event.time === selectedTime
      );
      
      if (eventExists) {
        Alert.alert('Time Conflict', 'You already have an event planned at this time');
        return;
      }
    }
    
    // Request notification permission
    await requestNotificationPermission();
    
    if (isEditingEvent && eventToEdit) {
      // We're updating an existing event
      const updatedEvent: PlannedEvent = {
        ...eventToEdit,
        activity: selectedActivityObj?.name || 'Event',
        description: eventDescription,
        date: selectedDate,
        time: selectedTime,
        duration: selectedDuration
      };
      
      // Update the notification
      const notificationId = await updateEventNotification(updatedEvent);
      
      // Update the event in state and storage
      const updatedEvents = plannedEvents.map(event => 
        event.id === updatedEvent.id ? updatedEvent : event
      );
      updatePlannedEventsWithStorage(updatedEvents);
      
      // Reset editing state
      setIsEditingEvent(false);
      setEventToEdit(null);
      
      // Show confirmation
      Alert.alert(
        'Success', 
        `Your event has been updated!${notificationId ? ' The reminder has been rescheduled.' : ''}`
      );
    } else {
      // We're creating a new event
      const newEvent: PlannedEvent = {
        id: Date.now().toString(),
        activity: selectedActivityObj?.name || 'Event',
        description: eventDescription,
        date: selectedDate,
        time: selectedTime,
        duration: selectedDuration
      };
      
      // Schedule a notification for this event
      const notificationId = await scheduleEventNotification(newEvent);
      
      // Add the event to state and storage
      const updatedEvents = [...plannedEvents, newEvent];
      updatePlannedEventsWithStorage(updatedEvents);
      
      // Show confirmation
      Alert.alert(
        'Success', 
        `Your event has been planned!${notificationId ? ' A reminder will notify you 5 minutes before the event.' : ''}`
      );
    }
    
    // Reset form
    setEventDescription('');
    setSelectedActivity('');
  };

  // Add a function to cancel editing
  const handleCancelEdit = () => {
    setIsEditingEvent(false);
    setEventToEdit(null);
    setEventDescription('');
    setSelectedActivity('');
    // Reset other form fields if needed
  };

  // Function to get weather data for the selected date and time
  const getWeatherForSelectedTime = (): WeatherTimeData | null => {
    if (!forecast) return null;
    
    const selectedDateObj = new Date();
    
    // Parse the selected date string to get day offset
    const dayOffset = selectedDateIndex; // 0 for today, 1 for tomorrow, etc.
    selectedDateObj.setDate(selectedDateObj.getDate() + dayOffset);
    
    // Parse the selected time
    selectedDateObj.setHours(selectedHour);
    selectedDateObj.setMinutes(selectedMinute);
    selectedDateObj.setSeconds(0);
    
    // Get forecast for the selected date
    const selectedDayForecasts = forecast.daily.filter(day => {
      const forecastDate = new Date(day.date * 1000);
      return forecastDate.getDate() === selectedDateObj.getDate() &&
             forecastDate.getMonth() === selectedDateObj.getMonth() &&
             forecastDate.getFullYear() === selectedDateObj.getFullYear();
    });
    
    if (selectedDayForecasts.length === 0) return null;
    
    // Get hourly forecasts for the selected day
    const selectedDayHourly = forecast.hourly.filter(hour => {
      const hourDate = new Date(hour.date * 1000);
      return hourDate.getDate() === selectedDateObj.getDate() &&
             hourDate.getMonth() === selectedDateObj.getMonth() &&
             hourDate.getFullYear() === selectedDateObj.getFullYear();
    });
    
    // Find the hourly forecast closest to the selected time
    let closestHourlyForecast: WeatherHourlyData | null = null;
    let smallestTimeDiff = Infinity;
    
    selectedDayHourly.forEach(hour => {
      const hourDate = new Date(hour.date * 1000);
      const timeDiff = Math.abs(hourDate.getTime() - selectedDateObj.getTime());
      if (timeDiff < smallestTimeDiff) {
        smallestTimeDiff = timeDiff;
        closestHourlyForecast = hour as WeatherHourlyData;
      }
    });
    
    if (!closestHourlyForecast) return null;
    
    return {
      daily: selectedDayForecasts[0] as WeatherDailyData,
      hourly: closestHourlyForecast,
      selectedTime: selectedDateObj.getTime()
    };
  };
  
  // Find alternative times with better weather for the selected activity
  const findBetterTimes = (weatherData: WeatherTimeData, activityName: string): string[] => {
    if (!forecast || !weatherData) return [];
    
    // Activity-specific weather preferences
    const activityPreferences: {[key: string]: { maxRainChance: number, maxWindSpeed: number, idealTemp: number }} = {
      'Jogging': { maxRainChance: 0.3, maxWindSpeed: 20, idealTemp: 18 },
      'Picnic': { maxRainChance: 0.1, maxWindSpeed: 15, idealTemp: 23 },
      'Hiking': { maxRainChance: 0.2, maxWindSpeed: 18, idealTemp: 20 },
      'BBQ': { maxRainChance: 0.1, maxWindSpeed: 10, idealTemp: 25 },
      'Beach': { maxRainChance: 0.1, maxWindSpeed: 12, idealTemp: 27 },
      'Outdoor Party': { maxRainChance: 0.2, maxWindSpeed: 15, idealTemp: 22 },
      'Camping': { maxRainChance: 0.3, maxWindSpeed: 15, idealTemp: 18 },
      'Sports': { maxRainChance: 0.2, maxWindSpeed: 15, idealTemp: 21 },
    };
    
    // Default preferences if activity not found
    const defaultPrefs = { maxRainChance: 0.2, maxWindSpeed: 15, idealTemp: 22 };
    
    // Get preferences for the selected activity
    const prefs = activityPreferences[activityName] || defaultPrefs;
    
    // Check 24 hours before and after the selected time
    const selectedTime = new Date(weatherData.selectedTime);
    const alternativeTimes: Array<{time: string, score: number, hourDate: Date}> = [];
    
    // Check each hourly forecast
    forecast.hourly.forEach(hour => {
      const hourDate = new Date(hour.date * 1000);
      const timeDiff = Math.abs(hourDate.getTime() - selectedTime.getTime());
      
      // Only consider times within 24 hours of the selected time
      if (timeDiff <= 24 * 60 * 60 * 1000) {
        // Check if this time has better weather
        const isBetterWeather = 
          (hour.pop || 0) <= prefs.maxRainChance && 
          hour.windSpeed <= prefs.maxWindSpeed &&
          Math.abs(hour.temperature.day - prefs.idealTemp) < 5;
        
        if (isBetterWeather) {
          alternativeTimes.push({
            time: format(hourDate, 'EEE, MMM d, h:mm a'),
            score: calculateWeatherScore(hour, prefs),
            hourDate: hourDate
          });
        }
      }
    });
    
    // Sort by weather score (higher is better)
    alternativeTimes.sort((a, b) => b.score - a.score);
    
    // Return top 3 alternative times
    return alternativeTimes.slice(0, 3).map(alt => alt.time);
  };
  
  // Calculate a score for the weather conditions
  const calculateWeatherScore = (forecast: WeatherHourlyData, preferences: { maxRainChance: number, maxWindSpeed: number, idealTemp: number }) => {
    // Start with a base score of 100
    let score = 100;
    
    // Subtract points for rain chance
    score -= (forecast.pop || 0) * 100;
    
    // Subtract points for wind speed distance from ideal
    score -= Math.min(Math.abs(forecast.windSpeed - 5), preferences.maxWindSpeed) * 2;
    
    // Subtract points for temperature distance from ideal
    score -= Math.abs(forecast.temperature.day - preferences.idealTemp) * 3;
    
    return score;
  };

  // Modify the handleCheckWeather to analyze forecast and provide recommendations
  const handleCheckWeather = async () => {
    if (!selectedActivity) {
      Alert.alert('Missing Information', 'Please select an activity first');
      return;
    }
    
    if (isLoadingWeather || !forecast) {
      Alert.alert('Weather Data', 'Weather data is still loading. Please try again in a moment.');
      return;
    }
    
    setIsLoadingRecommendation(true);
    
    try {
      // Get weather data for the selected time
      const weatherData = getWeatherForSelectedTime();
      
      console.log('Weather data retrieved:', weatherData);
      
      if (!weatherData) {
        throw new Error('Could not retrieve weather data for the selected time');
      }
      
      // Get the selected activity name
      const activityObj = activities.find(a => a.id === selectedActivity);
      const activityName = activityObj ? activityObj.name : 'your activity';
      
      // Find better times for the activity if needed
      const betterTimes = findBetterTimes(weatherData, activityName);
      setRecommendedTimes(betterTimes);
      
      // Get weather description for the selected time
      const hourlyData = weatherData.hourly;
      
      // Get weather info from the hourly data
      const weatherDesc = hourlyData.weather.description;
      const temp = Math.round(hourlyData.temperature.day);
      const rainChance = Math.round((hourlyData.pop || 0) * 100);
      const wind = Math.round(hourlyData.windSpeed);
      const tempUnit = preferredUnits === 'imperial' ? 'F' : 'C';
      
      // Create a prompt for Gemini API
      const prompt = `You are Skylar, a weather assistant. A user is planning ${activityName} ${eventDescription ? `(${eventDescription})` : ''} 
        on ${selectedDate} at ${selectedTime}. 
        The weather forecast for that time is: ${temp}°${tempUnit}, ${weatherDesc}, ${rainChance}% chance of rain, wind speed of ${wind} ${preferredUnits === 'imperial' ? 'mph' : 'km/h'}.
        
        Should they reschedule this event due to weather concerns? If yes, why?
        If they should reschedule, suggest ${betterTimes.length > 0 ? 'one of these better times: ' + betterTimes.join(', ') : 'a better time window'}.
        Keep your response conversational, under 4 sentences, and directly focused on whether this plan is a good idea considering the weather.`;
      
      // Generate recommendation based on weather conditions
      let recommendation = '';
      
      console.log('Weather data for recommendation:', {
        temp,
        weatherDesc,
        rainChance,
        wind,
        activityName,
        betterTimes
      });
      
      // Check if weather is suitable for the activity
      const isGoodWeather = rainChance <= 20 && wind <= 15;
      
      if (isGoodWeather) {
        recommendation = `Great news! The weather looks perfect for your ${activityName}. 
          With ${temp}°${tempUnit}, ${weatherDesc}, and only ${rainChance}% chance of rain, 
          you should have ideal conditions.`;
      } else {
        recommendation = `The weather might be challenging for your ${activityName}. 
          With ${temp}°${tempUnit}, ${weatherDesc}, ${rainChance}% chance of rain, and ${wind} ${preferredUnits === 'imperial' ? 'mph' : 'km/h'} wind, 
          you might want to consider rescheduling.`;
      }
      
      // Add better time suggestions if available
      if (betterTimes.length > 0) {
        recommendation += ` Better times to consider: ${betterTimes.slice(0, 2).join(', ')}.`;
      }
      
      console.log('Generated recommendation:', recommendation);
      
      // Ensure we always have some text
      if (!recommendation || recommendation.trim() === '') {
        recommendation = `Weather analysis for ${activityName}: ${temp}°${tempUnit}, ${weatherDesc}, ${rainChance}% chance of rain.`;
      }
      
      setWeatherRecommendation(recommendation);
      
      // Show the recommendation
      setShowWeatherRecommendation(true);
    } catch (error) {
      console.error('Error analyzing weather:', error);
      Alert.alert(
        'Weather Analysis Error',
        'Could not analyze weather data. Please try again later.'
      );
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    console.log('View weather details');
  };
  
  // Handle date & time selection
  const handleDateSelection = () => {
    setShowCalendar(true);
  };
  
  // Handle custom duration selection
  const handleCustomDuration = () => {
    // Store previous duration before changing
    setPreviousDuration(selectedDuration);
    setSelectedDuration('Custom');
    setShowCustomTime(true);
  };
  
  // Handle closing custom time modal
  const handleCloseCustomTime = () => {
    // If no custom time was saved, revert to previous duration
    if (selectedDuration === 'Custom') {
      setSelectedDuration(previousDuration);
    }
    setShowCustomTime(false);
  };
  
  // Handle saving custom duration
  const handleSaveCustomDuration = () => {
    const hours = parseInt(customHours);
    const minutes = parseInt(customMinutes);
    
    let durationText = '';
    
    if (hours > 0) {
      durationText += `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    }
    
    if (minutes > 0) {
      if (durationText) durationText += ' ';
      durationText += `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    }
    
    if (durationText) {
      setSelectedDuration(durationText);
    } else {
      // If no duration entered, revert to previous
      setSelectedDuration(previousDuration);
    }
    
    setShowCustomTime(false);
  };

  // Add state for delete confirmation modal
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);

  // Update the delete handler
  const handleDeleteEvent = (id: string) => {
    setEventToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Update the plannedEvents state to load from storage on component mount
  useEffect(() => {
    const loadEvents = async () => {
      const events = await loadPlannedEvents();
      setPlannedEvents(events);
    };
    
    loadEvents();
  }, []);

  // Update the setPlannedEvents calls to also save to storage
  const updatePlannedEventsWithStorage = (events: PlannedEvent[]) => {
    setPlannedEvents(events);
    savePlannedEvents(events);
  };

  // Add confirm delete handler
  const confirmDelete = async () => {
    if (eventToDelete) {
      // Cancel the notification for this event
      await cancelEventNotification(eventToDelete);
      
      // Remove the event from state and storage
      const updatedEvents = plannedEvents.filter(event => event.id !== eventToDelete);
      updatePlannedEventsWithStorage(updatedEvents);
      
      setEventToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  // Add cancel delete handler
  const cancelDelete = () => {
    setEventToDelete(null);
    setShowDeleteConfirm(false);
  };

  // Generate dynamic calendar dates based on current date and available forecast
  const calendarDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Get number of days we have forecast data for
    const forecastDays = forecast?.daily?.length || 5;

    for (let i = 0; i < forecastDays; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      dates.push({
        day: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : daysOfWeek[date.getDay()],
        date: date.getDate().toString(),
        month: months[date.getMonth()],
        fullDate: date // Store full date object for comparison
      });
    }
    return dates;
  }, [forecast]);

  // Handle date selection with proper formatting
  const handleDateSelect = (index: number) => {
    setSelectedDateIndex(index);
    const selectedDate = calendarDates[index];
    setSelectedDate(`${selectedDate.day}, ${selectedDate.month} ${selectedDate.date}`);
  };
  
  // Handle time confirmation
  const handleTimeConfirm = () => {
    // Format the time with AM/PM
    const hour = selectedHour === 12 ? 12 : selectedHour % 12;
    const ampm = isAM ? 'AM' : 'PM';
    const minute = selectedMinute < 10 ? `0${selectedMinute}` : selectedMinute;
    setSelectedTime(`${hour}:${minute} ${ampm}`);
    setShowCalendar(false);
  };
  
  // Handle hour adjustment
  const adjustHour = (increment: boolean) => {
    if (increment) {
      setSelectedHour(prevHour => (prevHour === 12 ? 1 : prevHour + 1));
    } else {
      setSelectedHour(prevHour => (prevHour === 1 ? 12 : prevHour - 1));
    }
  };
  
  // Handle minute adjustment
  const adjustMinute = (increment: boolean) => {
    if (increment) {
      setSelectedMinute(prevMinute => (prevMinute === 55 ? 0 : prevMinute + 5));
    } else {
      setSelectedMinute(prevMinute => (prevMinute === 0 ? 55 : prevMinute - 5));
    }
  };

  // Convert existing durations to use shorter format
  useEffect(() => {
    if (formattingComplete || plannedEvents.length === 0) return;
    
    const updatedEvents = plannedEvents.map(event => {
      const duration = event.duration;
      let updatedDuration = duration;
      
      if (duration.includes('hour')) {
        updatedDuration = duration.replace('hour', 'hr').replace('hours', 'hrs');
      }
      if (duration.includes('minute')) {
        updatedDuration = updatedDuration.replace('minute', 'min').replace('minutes', 'mins');
      }
      
      return { ...event, duration: updatedDuration };
    });
    
    if (JSON.stringify(updatedEvents) !== JSON.stringify(plannedEvents)) {
      setPlannedEvents(updatedEvents);
      setFormattingComplete(true);
    }
  }, [plannedEvents, formattingComplete]);

  // Add this helper function to get hourly forecast for selected date
  const getHourlyForecastForDate = (selectedDateObj: Date) => {
    if (!forecast?.hourly) return [];

    const startOfDay = new Date(selectedDateObj);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDateObj);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all forecasts for the selected date
    const dayForecasts = forecast.hourly.filter(hour => {
      const hourDate = new Date(hour.date * 1000);
      return hourDate >= startOfDay && hourDate <= endOfDay;
    });

    // For current date, include all remaining hours
    const isToday = startOfDay.toDateString() === new Date().toDateString();
    if (isToday) {
      const currentHour = new Date().getHours();
      return dayForecasts.filter(hour => {
        const hourDate = new Date(hour.date * 1000);
        return hourDate.getHours() >= currentHour;
      });
    }

    return dayForecasts;
  };

  // Helper function to get weather icon name
  const getWeatherIconName = (iconCode: string): string => {
    // Map OpenWeather icons to Ionicons
    const iconMap: { [key: string]: string } = {
      '01d': 'sunny-outline',
      '01n': 'moon-outline',
      '02d': 'partly-sunny-outline',
      '02n': 'cloudy-night-outline',
      '03d': 'cloudy-outline',
      '03n': 'cloudy-outline',
      '04d': 'cloudy-outline',
      '04n': 'cloudy-outline',
      '09d': 'rainy-outline',
      '09n': 'rainy-outline',
      '10d': 'rainy-outline',
      '10n': 'rainy-outline',
      '11d': 'thunderstorm-outline',
      '11n': 'thunderstorm-outline',
      '13d': 'snow-outline',
      '13n': 'snow-outline',
      '50d': 'cloud-outline',
      '50n': 'cloud-outline'
    };
    
    return iconMap[iconCode] || 'cloudy-outline';
  };

  // Update the forecast data memo to use selected date
  const hourlyForecastData = useMemo(() => {
    const selectedDateObj = calendarDates[selectedDateIndex]?.fullDate;
    if (!selectedDateObj) return [];

    const hourlyData = getHourlyForecastForDate(selectedDateObj);
    
    return hourlyData.map(hour => {
      const hourDate = new Date(hour.date * 1000);
      return {
        id: hour.date.toString(),
        time: format(hourDate, 'h a'),
        temp: Math.round(hour.temperature.day) + '°',
        iconName: getMaterialWeatherIcon(hour.weather.icon),
        iconColor: getWeatherIconColor(hour.weather.icon),
        condition: hour.weather.description,
        pop: hour.pop || 0,
        wind: hour.windSpeed,
        humidity: hour.humidity
      };
    });
  }, [forecast, selectedDateIndex, calendarDates]);

  // Add this function to handle editing an event
  const handleEditEvent = (event: PlannedEvent) => {
    // Set the form fields to the event values
    setEventToEdit(event);
    setSelectedActivity(activities.find(a => a.name === event.activity)?.id || '');
    setEventDescription(event.description);
    setSelectedDate(event.date);
    setSelectedTime(event.time);
    setSelectedDuration(event.duration);
    setIsEditingEvent(true);
    
    // Scroll to the top of the form
    // You could add a ref to the form and use scrollTo here if needed
  };

  return (
    <View style={{ flex: 1, paddingBottom: adjust(30) }}>
      {/* <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" /> */}
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={styles.scrollContainer}
          overScrollMode="never"
          scrollEventThrottle={16}
          stickyHeaderIndices={initialized ? [2] : []}
        >
          {/* Header section */}
          <View style={styles.header}>
            <Text style={styles.title}>Plan Your Event</Text>
            <Text style={styles.subtitle}>Let Skylar check the weather for you</Text>
          </View>

          {/* Activity selection */}
          <View style={styles.activityListContainer}>
            <FlatList
              data={activities}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.activityList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.activityItem,
                    selectedActivity === item.id && styles.selectedActivityItem,
                  ]}
                  onPress={() => {
                    setSelectedActivity(item.id);
                    // Auto-populate the event description with the selected activity name
                    setEventDescription(item.name);
                  }}
                >
                  <View style={styles.activityIconContainer}>
                    {renderActivityIcon(item)}
                  </View>
                  <Text style={styles.activityName}>{item.name}</Text>
                </TouchableOpacity>
              )}
              nestedScrollEnabled={true}
              snapToAlignment="start"
              snapToInterval={adjust(10)}
              disableIntervalMomentum={true}
              decelerationRate="normal"
            />
          </View>

          {/* Native Ad near top to ensure visibility */}
          {initialized && (
            <View style={styles.adContainer}>
              <NativeAdComponent />
            </View>
          )}

         

          {/* Main planning card */}
          <View style={styles.planningCard}>
            {/* Event input */}
            <Text style={styles.inputLabel}>What are you planning?</Text>
            <TextInput
              style={styles.eventInput}
              placeholder="Type your event here..."
              placeholderTextColor="#aaa"
              value={eventDescription}
              onChangeText={setEventDescription}
            />

            {/* Date & Time selection */}
            <TouchableOpacity style={styles.dateTimeButton} onPress={handleDateSelection}>
              <Ionicons name="calendar-outline" size={adjust(16)} color="#4361EE" />
              <Text style={styles.dateTimeButtonText}>Select Date & Time</Text>
            </TouchableOpacity>

            {/* Date and Time display */}
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateContainer}>
                <Text style={styles.dateTimeLabel}>Date</Text>
                <Text style={styles.dateTimeValue}>{selectedDate}</Text>
              </View>
              <View style={styles.timeContainer}>
                <Text style={styles.dateTimeLabel}>Time</Text>
                <Text style={styles.dateTimeValue}>{selectedTime}</Text>
              </View>
            </View>

            {/* Duration selection */}
            <Text style={styles.durationLabel}>Duration</Text>
            <View style={styles.durationOptions}>
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  selectedDuration === '1 hour' && styles.selectedDurationButton,
                ]}
                onPress={() => setSelectedDuration('1 hour')}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration === '1 hour' && styles.selectedDurationText,
                  ]}
                >
                  1 hour
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  selectedDuration === '2 hours' && styles.selectedDurationButton,
                ]}
                onPress={() => setSelectedDuration('2 hours')}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration === '2 hours' && styles.selectedDurationText,
                  ]}
                >
                  2 hours
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  selectedDuration !== '1 hour' && selectedDuration !== '2 hours' && styles.selectedDurationButton,
                ]}
                onPress={handleCustomDuration}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    selectedDuration !== '1 hour' && selectedDuration !== '2 hours' && styles.selectedDurationText,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {/* Weather forecast */}
            <View style={styles.forecastSection}>
              <View style={styles.forecastHeader}>
                <View style={styles.forecastTitleContainer}>
                  <Ionicons name="sunny" size={adjust(16)} color="#FFD700" />
                  <Text style={styles.forecastTitle}>Weather Forecast</Text>
                </View>
              </View>

              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.hourlyForecastScroll}
              >
                {hourlyForecastData.length > 0 ? (
                  hourlyForecastData.map((item) => (
                    <View key={item.id} style={styles.forecastItem}>
                      <Text style={styles.forecastTime}>{item.time}</Text>
                      <MaterialCommunityIcons 
                        name={item.iconName}
                        size={adjust(18)}
                        color={item.iconColor}
                      />
                      <Text style={styles.forecastTemp}>{item.temp}</Text>
                      <Text style={styles.forecastCondition} numberOfLines={1}>
                        {item.condition}
                      </Text>
                      {item.pop > 0 && (
                        <Text style={styles.forecastRain}>
                          {Math.round(validateRainProbability(item.pop) * 100)}%
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.noForecastContainer}>
                    <Text style={styles.noForecastText}>
                      No forecast data available
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Confirm button inside the card */}
            <TouchableOpacity 
              style={styles.confirmEventButton} 
              onPress={handleConfirmEvent}
            >
              <Text style={styles.confirmEventButtonText}>
                {isEditingEvent ? 'Update Event' : 'Confirm Event'}
              </Text>
            </TouchableOpacity>

            {isEditingEvent && (
              <TouchableOpacity 
                style={styles.cancelEditButton} 
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelEditButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          

          {/* Assistant suggestion */}
          <View style={styles.assistantCard}>
            <View style={styles.assistantIconContainer}>
              <Ionicons name="person" size={adjust(20)} color="#fff" />
            </View>
            <Text style={styles.assistantText}>
              I'll find the perfect weather conditions for your event!
            </Text>
          </View>

          {/* Check weather button - now just checks weather instead of adding events */}
          <TouchableOpacity style={styles.checkButton} onPress={handleCheckWeather}>
            <Text style={styles.checkButtonText}>Check Weather</Text>
          </TouchableOpacity>
          
          {/* Planned events section */}
          {plannedEvents.length > 0 && (
            <View style={styles.plannedEventsSection}>
              <Text style={styles.sectionTitleText}>Your Planned Events</Text>
              
              {plannedEvents.map((event) => (
                <View key={event.id} style={styles.plannedEventCard}>
                  <View style={styles.plannedEventHeader}>
                    <Text style={styles.plannedEventActivity}>{event.activity}</Text>
                    <View style={styles.eventActionButtons}>
                      <TouchableOpacity 
                        style={styles.eventActionButton} 
                        onPress={() => handleEditEvent(event)}
                      >
                        <Ionicons name="pencil-outline" size={adjust(18)} color="#4361EE" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.eventActionButton} 
                        onPress={() => handleDeleteEvent(event.id)}
                      >
                        <Ionicons name="trash-outline" size={adjust(18)} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <Text style={styles.plannedEventDesc}>{event.description}</Text>
                  
                  <View style={styles.plannedEventDetails}>
                    <View style={styles.plannedEventDetail}>
                      <Ionicons name="calendar-outline" size={adjust(14)} color="#4361EE" />
                      <Text style={styles.plannedEventDetailText} numberOfLines={1}>{event.date}</Text>
                    </View>
                    
                    <View style={styles.plannedEventDetailsRow}>
                      <View style={styles.plannedEventDetail}>
                        <Ionicons name="time-outline" size={adjust(14)} color="#4361EE" />
                        <Text style={styles.plannedEventDetailText} numberOfLines={1}>{event.time}</Text>
                      </View>
                      
                      <View style={styles.plannedEventDetail}>
                        <Ionicons name="timer-outline" size={adjust(14)} color="#4361EE" />
                        <Text style={styles.plannedEventDetailText}>{event.duration}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Date and Time Selection Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showCalendar}
          onRequestClose={() => setShowCalendar(false)}
        >
          <TouchableWithoutFeedback onPress={() => setShowCalendar(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.calendarModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Date & Time</Text>
                    <TouchableOpacity onPress={() => setShowCalendar(false)} style={styles.closeButton}>
                      <Ionicons name="close" size={adjust(20)} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* Calendar Section */}
                  <View style={styles.calendarSection}>
                    <Text style={styles.sectionTitle}>Date</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {calendarDates.map((date, index) => (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.dateItem,
                            selectedDateIndex === index && styles.selectedDateItem,
                          ]}
                          onPress={() => handleDateSelect(index)}
                        >
                          <Text
                            style={[
                              styles.dateItemDay,
                              selectedDateIndex === index && styles.selectedDateText,
                            ]}
                          >
                            {date.day}
                          </Text>
                          <Text
                            style={[
                              styles.dateItemDate,
                              selectedDateIndex === index && styles.selectedDateText,
                            ]}
                          >
                            {date.date}
                          </Text>
                          <Text
                            style={[
                              styles.dateItemMonth,
                              selectedDateIndex === index && styles.selectedDateText,
                            ]}
                          >
                            {date.month}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  
                  {/* Time Section */}
                  <View style={styles.timeSection}>
                    <Text style={styles.sectionTitle}>Time</Text>
                    <View style={styles.timeSelector}>
                      {/* Hour selector */}
                      <View style={styles.timeSelectorUnit}>
                        <TouchableOpacity onPress={() => adjustHour(true)} style={styles.timeAdjustButton}>
                          <Ionicons name="chevron-up" size={adjust(20)} color="#4361EE" />
                        </TouchableOpacity>
                        <Text style={styles.timeValue}>
                          {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}
                        </Text>
                        <TouchableOpacity onPress={() => adjustHour(false)} style={styles.timeAdjustButton}>
                          <Ionicons name="chevron-down" size={adjust(20)} color="#4361EE" />
                        </TouchableOpacity>
                      </View>
                      
                      <Text style={styles.timeColon}>:</Text>
                      
                      {/* Minute selector */}
                      <View style={styles.timeSelectorUnit}>
                        <TouchableOpacity onPress={() => adjustMinute(true)} style={styles.timeAdjustButton}>
                          <Ionicons name="chevron-up" size={adjust(20)} color="#4361EE" />
                        </TouchableOpacity>
                        <Text style={styles.timeValue}>
                          {selectedMinute < 10 ? `0${selectedMinute}` : selectedMinute}
                        </Text>
                        <TouchableOpacity onPress={() => adjustMinute(false)} style={styles.timeAdjustButton}>
                          <Ionicons name="chevron-down" size={adjust(20)} color="#4361EE" />
                        </TouchableOpacity>
                      </View>
                      
                      {/* AM/PM selector */}
                      <View style={styles.ampmSelector}>
                        <TouchableOpacity
                          style={[
                            styles.ampmButton,
                            isAM && styles.selectedAmpmButton,
                          ]}
                          onPress={() => setIsAM(true)}
                        >
                          <Text
                            style={[
                              styles.ampmButtonText,
                              isAM && styles.selectedAmpmButtonText,
                            ]}
                          >
                            AM
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.ampmButton,
                            !isAM && styles.selectedAmpmButton,
                          ]}
                          onPress={() => setIsAM(false)}
                        >
                          <Text
                            style={[
                              styles.ampmButtonText,
                              !isAM && styles.selectedAmpmButtonText,
                            ]}
                          >
                            PM
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                  
                  {/* Confirm button */}
                  <TouchableOpacity style={styles.confirmButton} onPress={handleTimeConfirm}>
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
        
        {/* Custom Duration Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showCustomTime}
          onRequestClose={handleCloseCustomTime}
        >
          <TouchableWithoutFeedback onPress={handleCloseCustomTime}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                <View style={styles.customTimeModal}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Set Custom Duration</Text>
                    <TouchableOpacity onPress={handleCloseCustomTime} style={styles.closeButton}>
                      <Ionicons name="close" size={adjust(20)} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.customTimeContent}>
                    <Text style={styles.customTimeLabel}>Enter duration:</Text>
                    
                    <View style={styles.customTimeInputRow}>
                      <View style={styles.customTimeInputContainer}>
                        <TextInput
                          style={styles.customTimeInput}
                          keyboardType="number-pad"
                          value={customHours}
                          onChangeText={setCustomHours}
                          maxLength={2}
                        />
                        <Text style={styles.customTimeUnit}>hr</Text>
                      </View>
                      
                      <View style={styles.customTimeSeparator}>
                        <Text style={styles.customTimeSeparatorText}>:</Text>
                      </View>
                      
                      <View style={styles.customTimeInputContainer}>
                        <TextInput
                          style={styles.customTimeInput}
                          keyboardType="number-pad"
                          value={customMinutes}
                          onChangeText={setCustomMinutes}
                          maxLength={2}
                        />
                        <Text style={styles.customTimeUnit}>min</Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity style={styles.confirmButton} onPress={handleSaveCustomDuration}>
                      <Text style={styles.confirmButtonText}>Save</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </LinearGradient>
      
      {/* Weather Recommendation Modal */}
      <Modal
        visible={showWeatherRecommendation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeatherRecommendation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.weatherRecommendationModal}>
            <View style={styles.weatherRecommendationHeader}>
              <MaterialCommunityIcons name="weather-cloudy" size={adjust(24)} color="#4361EE" />
              <Text style={styles.weatherRecommendationTitle}>Skylar's Recommendation</Text>
              <TouchableOpacity onPress={() => setShowWeatherRecommendation(false)}>
                <Ionicons name="close" size={adjust(24)} color="#333" />
              </TouchableOpacity>
            </View>
            
            {isLoadingRecommendation ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4361EE" />
                <Text style={styles.loadingText}>Analyzing weather conditions...</Text>
              </View>
            ) : (
              <View style={styles.weatherRecommendationContent}>
                <Text style={styles.weatherRecommendationText}>
                  {weatherRecommendation || 'Weather analysis complete. No specific recommendations at this time.'}
                </Text>
                
                {weatherRecommendation && (
                  <View style={styles.weatherDetailsContainer}>
                    <Text style={styles.weatherDetailsTitle}>Weather Details:</Text>
                    <View style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>Temperature: {getWeatherForSelectedTime()?.hourly.temperature.day || 'N/A'}°{preferredUnits === 'imperial' ? 'F' : 'C'}</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>Condition: {getWeatherForSelectedTime()?.hourly.weather.description || 'N/A'}</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>Rain Chance: {Math.round(validateRainProbability(getWeatherForSelectedTime()?.hourly.pop || 0) * 100)}%</Text>
                    </View>
                    <View style={styles.bulletPoint}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>Wind Speed: {getWeatherForSelectedTime()?.hourly.windSpeed || 'N/A'} {preferredUnits === 'imperial' ? 'mph' : 'km/h'}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeRecommendationButton}
              onPress={() => setShowWeatherRecommendation(false)}
            >
              <Text style={styles.closeRecommendationButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={deleteModalStyles.modal}>
            <View style={deleteModalStyles.header}>
              <MaterialCommunityIcons name="alert-circle-outline" size={adjust(24)} color="#FF6B6B" />
              <Text style={deleteModalStyles.title}>Delete Event</Text>
            </View>
            
            <Text style={deleteModalStyles.message}>
              Are you sure you want to delete this event?
            </Text>
            
            <View style={deleteModalStyles.buttonsContainer}>
              <TouchableOpacity 
                style={[deleteModalStyles.button, deleteModalStyles.cancelButton]} 
                onPress={cancelDelete}
              >
                <Text style={deleteModalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[deleteModalStyles.button, deleteModalStyles.deleteButton]} 
                onPress={confirmDelete}
              >
                <Text style={deleteModalStyles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: adjust(8),
    backgroundColor: '#fff',
    zIndex: 5,
    elevation: 3,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: adjust(12),
    paddingBottom: adjust(25), // Add padding for tab bar
  },
  header: {
    marginTop: adjust(12),
    marginBottom: adjust(12),
  },
  title: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(4),
  },
  subtitle: {
    fontSize: adjust(12),
    color: '#666',
    marginTop: adjust(2),
  },
  activityListContainer: {
    marginBottom: adjust(12),
  },
  activityList: {
    paddingVertical: adjust(6),
    paddingHorizontal: adjust(12),
  },
  activityItem: {
    backgroundColor: '#FFD859',
    borderRadius: adjust(12),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(12),
    marginRight: adjust(8),
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedActivityItem: {
    backgroundColor: '#FFB319',
  },
  activityIconContainer: {
    marginRight: adjust(6),
  },
  activityName: {
    fontSize: adjust(12),
    fontWeight: '500',
    color: '#333',
  },
  planningCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(12),
    marginBottom: adjust(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  inputLabel: {
    fontSize: adjust(12),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(6),
  },
  eventInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: adjust(8),
    padding: adjust(10),
    fontSize: adjust(12),
    color: '#333',
    marginBottom: adjust(12),
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12),
  },
  dateTimeButtonText: {
    fontSize: adjust(12),
    color: '#4361EE',
    fontWeight: '500',
    marginLeft: adjust(6),
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(12),
  },
  dateContainer: {
    flex: 1,
    marginRight: adjust(6),
  },
  timeContainer: {
    flex: 1,
    marginLeft: adjust(6),
  },
  dateTimeLabel: {
    fontSize: adjust(11),
    color: '#666',
    marginBottom: adjust(4),
  },
  dateTimeValue: {
    fontSize: adjust(12),
    fontWeight: '500',
    color: '#333',
  },
  durationLabel: {
    fontSize: adjust(12),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(12),
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(8),
    marginRight: adjust(8),
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: '#4361EE',
  },
  durationButtonText: {
    fontSize: adjust(11),
    color: '#666',
  },
  selectedDurationText: {
    color: '#fff',
    fontWeight: '500',
  },
  // Weather forecast section styles
  forecastSection: {
    marginVertical: adjust(12),
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(10),
    paddingHorizontal: adjust(4),
  },
  forecastTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastTitle: {
    fontSize: adjust(13),
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(6),
  },
  hourlyForecastScroll: {
    paddingVertical: adjust(6),
    paddingHorizontal: adjust(4),
  },
  forecastItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: adjust(12),
    padding: adjust(8),
    marginRight: adjust(8),
    minWidth: adjust(80),
  },
  forecastTime: {
    fontSize: adjust(12),
    color: '#333',
    fontWeight: '500',
    marginBottom: adjust(4),
  },
  forecastTemp: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginVertical: adjust(4),
  },
  forecastCondition: {
    fontSize: adjust(10),
    color: '#666',
    textAlign: 'center',
  },
  forecastRain: {
    fontSize: adjust(10),
    color: '#4361EE',
    marginTop: adjust(2),
  },
  noForecastContainer: {
    padding: adjust(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  noForecastText: {
    fontSize: adjust(11),
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    width: '90%',
    padding: adjust(16),
    maxWidth: adjust(320),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  customTimeModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(16),
    width: '90%',
    maxWidth: adjust(320),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: adjust(12),
    paddingBottom: adjust(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    paddingVertical: adjust(10),
  },
  closeButton: {
    width: adjust(24),
    height: adjust(24),
    borderRadius: adjust(12),
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
  },
  calendarSection: {
    marginBottom: adjust(20),
  },
  sectionTitle: {
    fontSize: adjust(13),
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(10),
  },
  dateItem: {
    backgroundColor: '#f0f0f0',
    borderRadius: adjust(10),
    padding: adjust(10),
    marginRight: adjust(10),
    alignItems: 'center',
    minWidth: adjust(75),
  },
  selectedDateItem: {
    backgroundColor: '#4361EE',
  },
  dateItemDay: {
    fontSize: adjust(12),
    fontWeight: '500',
  },
  dateItemDate: {
    fontSize: adjust(14),
    fontWeight: '600',
    marginVertical: adjust(2),
  },
  dateItemMonth: {
    fontSize: adjust(11),
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  timeSection: {
    marginBottom: adjust(12),
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: adjust(12),
  },
  timeSelectorUnit: {
    alignItems: 'center',
    marginHorizontal: adjust(8),
  },
  timeAdjustButton: {
    width: adjust(36),
    height: adjust(36),
    borderRadius: adjust(18),
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: adjust(4),
  },
  timeValue: {
    fontSize: adjust(20),
    fontWeight: '600',
    color: '#333',
    marginVertical: adjust(4),
    minWidth: adjust(36),
    textAlign: 'center',
  },
  timeColon: {
    fontSize: adjust(20),
    fontWeight: '600',
    color: '#333',
  },
  ampmSelector: {
    flexDirection: 'column',
    marginLeft: adjust(16),
  },
  ampmButton: {
    width: adjust(45),
    paddingVertical: adjust(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(8),
    backgroundColor: '#f0f0f0',
    marginVertical: adjust(4),
  },
  selectedAmpmButton: {
    backgroundColor: '#4361EE',
  },
  ampmButtonText: {
    fontSize: adjust(12),
    fontWeight: '500',
    color: '#333',
  },
  selectedAmpmButtonText: {
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    alignItems: 'center',
    marginTop: adjust(12),
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: adjust(11),
    fontWeight: '600',
  },
  
  customTimeContent: {
    marginBottom: adjust(12),
  },
  customTimeLabel: {
    fontSize: adjust(12),
    color: '#666',
    marginBottom: adjust(6),
  },
  customTimeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(8),
  },
  customTimeInputContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: '45%',
  },
  customTimeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: adjust(8),
    padding: adjust(8),
    fontSize: adjust(12),
    color: '#333',
    width: '100%',
  },
  customTimeUnit: {
    fontSize: adjust(11),
    color: '#666',
    marginLeft: adjust(4),
  },
  customTimeSeparator: {
    width: adjust(10),
    textAlign: 'center',
  },
  customTimeSeparatorText: {
    fontSize: adjust(12),
    color: '#666',
  },
  
  plannedEventsSection: {
    marginTop: adjust(8),
    marginBottom: adjust(12),
  },
  sectionTitleText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  plannedEventCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(12),
    marginBottom: adjust(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  plannedEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(6),
  },
  plannedEventActivity: {
    fontSize: adjust(12),
    fontWeight: '600',
    color: '#333',
  },
  plannedEventDesc: {
    fontSize: adjust(11),
    color: '#666',
    marginBottom: adjust(8),
  },
  plannedEventDetails: {
    flexDirection: 'column',
  },
  plannedEventDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: adjust(4),
  },
  plannedEventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: adjust(8),
    flexShrink: 1,
  },
  plannedEventDetailText: {
    fontSize: adjust(11),
    color: '#333',
    marginLeft: adjust(4),
    flexShrink: 1,
  },
  confirmEventButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    alignItems: 'center',
    marginTop: adjust(12),
  },
  confirmEventButtonText: {
    color: '#fff',
    fontSize: adjust(11),
    fontWeight: '600',
  },
  weatherRecommendationModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(16),
    padding: adjust(20),
    width: '90%',
    maxWidth: adjust(340),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  weatherRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: adjust(16),
    paddingBottom: adjust(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weatherRecommendationTitle: {
    fontSize: adjust(16),
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    marginLeft: adjust(8),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: adjust(16),
  },
  loadingText: {
    color: '#333',
    fontSize: adjust(12),
    marginTop: adjust(8),
  },
  weatherRecommendationContent: {
    paddingVertical: adjust(16),
    minHeight: adjust(80),
  },
  weatherRecommendationText: {
    color: '#2c2c2c',
    fontSize: adjust(13),
    marginBottom: adjust(8),
    lineHeight: adjust(22),
    textAlign: 'left',
    fontWeight: '400',
  },
  weatherDetailsContainer: {
    marginTop: adjust(12),
  },
  weatherDetailsTitle: {
    fontSize: adjust(13),
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: adjust(8),
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: adjust(4),
  },
  bullet: {
    fontSize: adjust(12),
    color: '#4361EE',
    marginRight: adjust(8),
    marginTop: adjust(1),
  },
  bulletText: {
    fontSize: adjust(12),
    color: '#2c2c2c',
    flex: 1,
    lineHeight: adjust(16),
  },
  betterTimesContainer: {
    marginTop: adjust(8),
  },
  betterTimesTitle: {
    fontSize: adjust(12),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  betterTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(4),
  },
  betterTimeText: {
    color: '#333',
    fontSize: adjust(11),
    marginLeft: adjust(4),
  },
  closeRecommendationButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(12),
    paddingVertical: adjust(12),
    alignItems: 'center',
    marginTop: adjust(16),
    shadowColor: '#4361EE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  closeRecommendationButtonText: {
    color: '#fff',
    fontSize: adjust(14),
    fontWeight: '600',
  },
  assistantCard: {
    backgroundColor: '#517FE0',
    borderRadius: adjust(12),
    padding: adjust(12),
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: adjust(10),
    marginBottom: adjust(12),
  },
  assistantIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: adjust(16),
    width: adjust(32),
    height: adjust(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(10),
  },
  assistantText: {
    color: '#fff',
    fontSize: adjust(12),
    flex: 1,
    lineHeight: adjust(16),
  },
  checkButton: {
    backgroundColor: '#FFD859',
    borderRadius: adjust(15),
    paddingVertical: adjust(14),
    alignItems: 'center',
    marginBottom: adjust(20),
  },
  checkButtonText: {
    color: '#333',
    fontSize: adjust(15),
    fontWeight: '600',
  },
  eventActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventActionButton: {
    marginLeft: adjust(10),
  },
  cancelEditButton: {
    backgroundColor: '#f1f1f1',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    alignItems: 'center',
    marginTop: adjust(8),
  },
  cancelEditButtonText: {
    color: '#666',
    fontSize: adjust(11),
    fontWeight: '600',
  },
  weatherSection: {
    marginTop: adjust(15),
    paddingHorizontal: adjust(15),
  },
  weatherScrollContent: {
    paddingVertical: adjust(10),
  },
  weatherCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(10),
    marginRight: adjust(10),
    width: adjust(80),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeText: {
    fontSize: adjust(12),
    color: '#333',
    marginBottom: adjust(5),
  },
  weatherIcon: {
    marginVertical: adjust(5),
  },
  tempText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(5),
  },
  weatherDetails: {
    width: '100%',
  },
  weatherDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(3),
  },
  detailText: {
    fontSize: adjust(10),
    color: '#666',
    marginLeft: adjust(3),
  },
});

// Separate styles for delete confirmation modal
const deleteModalStyles = StyleSheet.create({
  modal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(16),
    width: '85%',
    maxWidth: adjust(320),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12),
    width: '100%',
  },
  title: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(8),
  },
  message: {
    fontSize: adjust(14),
    color: '#666',
    textAlign: 'center',
    marginBottom: adjust(16),
    lineHeight: adjust(20),
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: adjust(8),
  },
  button: {
    flex: 1,
    paddingVertical: adjust(10),
    borderRadius: adjust(8),
    alignItems: 'center',
    marginHorizontal: adjust(8),
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
  },
  cancelText: {
    color: '#333',
    fontSize: adjust(14),
    fontWeight: '500',
  },
  deleteText: {
    color: '#fff',
    fontSize: adjust(14),
    fontWeight: '500',
  },
});

export default PlanningScreen; 