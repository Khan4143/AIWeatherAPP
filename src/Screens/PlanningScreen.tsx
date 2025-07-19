import React, { useState, useEffect, useMemo } from 'react';
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

const PlanningScreen = ({ navigation }: { navigation: any }) => {
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
  
  // For tracking format updates
  const [formattingComplete, setFormattingComplete] = useState(false);
  
  // Weather recommendation state
  const [showWeatherRecommendation, setShowWeatherRecommendation] = useState(false);
  const [weatherRecommendation, setWeatherRecommendation] = useState<string>('');
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [recommendedTimes, setRecommendedTimes] = useState<string[]>([]);
  
  // Get weather data from context
  const { forecast, currentWeather, isLoading: isLoadingWeather } = useWeatherContext();
  
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

    // Convert forecast data to the format we need
    return forecast.hourly.slice(0, 6).map((hourData, index) => {
      const time = format(new Date(hourData.date * 1000), 'h a');
      const temp = Math.round(hourData.temperature.day) + '°';
      
      // Map weather conditions to icons
      let icon = 'sunny-outline';
      if (hourData.weather.icon.includes('01')) icon = 'sunny-outline';
      else if (hourData.weather.icon.includes('02')) icon = 'partly-sunny-outline';
      else if (hourData.weather.icon.includes('03') || hourData.weather.icon.includes('04')) icon = 'cloudy-outline';
      else if (hourData.weather.icon.includes('09') || hourData.weather.icon.includes('10')) icon = 'rainy-outline';
      else if (hourData.weather.icon.includes('11')) icon = 'thunderstorm-outline';
      else if (hourData.weather.icon.includes('13')) icon = 'snow-outline';
      else if (hourData.weather.icon.includes('50')) icon = 'cloud-outline';
      
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
  }, [forecast]);

  // State for date and time
  const [selectedDate, setSelectedDate] = useState('Today, Feb 15');
  const [selectedTime, setSelectedTime] = useState('4:00 PM');

  // Add state for selected date and time in the modal
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

  // Handle confirming an event
  const handleConfirmEvent = () => {
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
      
    // Check if there's already an event at the same time
    const eventExists = plannedEvents.some(
      event => event.date === selectedDate && event.time === selectedTime
    );
    
    if (eventExists) {
      Alert.alert('Time Conflict', 'You already have an event planned at this time');
      return;
    }
    
    // Create and add the new event
    const newEvent: PlannedEvent = {
      id: Date.now().toString(),
      activity: selectedActivityObj?.name || 'Event',
      description: eventDescription,
      date: selectedDate,
      time: selectedTime,
      duration: selectedDuration
    };
    
    setPlannedEvents([...plannedEvents, newEvent]);
    
    // Reset form
    setEventDescription('');
    setSelectedActivity('');

    // Show confirmation
    Alert.alert('Success', 'Your event has been planned!');
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
      
      // Create a prompt for Gemini API
      const prompt = `You are Skylar, a weather assistant. A user is planning ${activityName} ${eventDescription ? `(${eventDescription})` : ''} 
        on ${selectedDate} at ${selectedTime}. 
        The weather forecast for that time is: ${temp}°C, ${weatherDesc}, ${rainChance}% chance of rain, wind speed of ${wind} km/h.
        
        Should they reschedule this event due to weather concerns? If yes, why?
        If they should reschedule, suggest ${betterTimes.length > 0 ? 'one of these better times: ' + betterTimes.join(', ') : 'a better time window'}.
        Keep your response conversational, under 4 sentences, and directly focused on whether this plan is a good idea considering the weather.`;
      
      // Call Gemini API for a recommendation
      if (currentWeather) {
        const response = await generateResponse(prompt, currentWeather);
        setWeatherRecommendation(response.text);
      } else {
        setWeatherRecommendation(`Based on the forecast (${weatherDesc}, ${temp}°C, ${rainChance}% chance of rain), 
          ${rainChance > 30 ? 'you might want to reschedule your ' + activityName : activityName + ' conditions look good'}. 
          ${betterTimes.length > 0 ? 'Consider: ' + betterTimes[0] : ''}`);
      }
      
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

  // Delete a planned event
  const handleDeleteEvent = (id: string) => {
    setPlannedEvents(plannedEvents.filter(event => event.id !== id));
  };

  // Calendar dates
  const calendarDates = [
    { day: 'Today', date: '15', month: 'Feb' },
    { day: 'Tomorrow', date: '16', month: 'Feb' },
    { day: 'Friday', date: '17', month: 'Feb' },
    { day: 'Saturday', date: '18', month: 'Feb' },
    { day: 'Sunday', date: '19', month: 'Feb' },
  ];
  
  // Time slots
  const timeSlots = [
    { time: '9:00 AM', selected: false },
    { time: '10:00 AM', selected: false },
    { time: '11:00 AM', selected: false },
    { time: '12:00 PM', selected: false },
    { time: '1:00 PM', selected: false },
    { time: '2:00 PM', selected: false },
    { time: '3:00 PM', selected: false },
    { time: '4:00 PM', selected: true },
    { time: '5:00 PM', selected: false },
    { time: '6:00 PM', selected: false },
    { time: '7:00 PM', selected: false },
    { time: '8:00 PM', selected: false },
  ];

  // Handle date selection
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
          overScrollMode="never"
          scrollEventThrottle={16}
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
                <TouchableOpacity onPress={handleViewDetails}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </TouchableOpacity>
              </View>

              {/* Hourly forecast */}
              <View style={styles.hourlyForecast}>
                {forecastData.map((item) => (
                  <View key={item.id} style={styles.forecastItem}>
                    <Text style={styles.forecastTime}>{item.time}</Text>
                    <Ionicons name={item.icon} size={adjust(16)} color={item.time === '2 PM' ? '#FFD700' : '#6e7689'} />
                    <Text style={styles.forecastTemp}>{item.temp}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Confirm button inside the card */}
            <TouchableOpacity 
              style={styles.confirmEventButton} 
              onPress={handleConfirmEvent}
            >
              <Text style={styles.confirmEventButtonText}>Confirm Event</Text>
            </TouchableOpacity>
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
                    <TouchableOpacity onPress={() => handleDeleteEvent(event.id)}>
                      <Ionicons name="trash-outline" size={adjust(18)} color="#FF6B6B" />
                    </TouchableOpacity>
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
                              selectedDateIndex === index && { color: '#fff' },
                            ]}
                          >
                            {date.day}
                          </Text>
                          <Text
                            style={[
                              styles.dateItemDate,
                              selectedDateIndex === index && { color: '#fff' },
                            ]}
                          >
                            {date.date}
                          </Text>
                          <Text
                            style={[
                              styles.dateItemMonth,
                              selectedDateIndex === index && { color: '#fff' },
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
                <Text style={styles.weatherRecommendationText}>{weatherRecommendation}</Text>
                
                {recommendedTimes.length > 0 && (
                  <View style={styles.betterTimesContainer}>
                    <Text style={styles.betterTimesTitle}>Recommended Times:</Text>
                    {recommendedTimes.map((time, index) => (
                      <View key={index} style={styles.betterTimeItem}>
                        <Ionicons name="checkmark-circle" size={adjust(16)} color="#4CAF50" />
                        <Text style={styles.betterTimeText}>{time}</Text>
                      </View>
                    ))}
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
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: adjust(12), // Match HomeScreen
    paddingBottom: adjust(16),
  },
  header: {
    marginTop: adjust(12), // Match HomeScreen
    marginBottom: adjust(12), // Match HomeScreen
  },
  title: {
    fontSize: adjust(16), // Reduced like HomeScreen
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(4), // Match HomeScreen
  },
  subtitle: {
    fontSize: adjust(12), 
    color: '#666',
    marginTop: adjust(2),
  },
  activityListContainer: {
    marginBottom: adjust(12), // Match HomeScreen card spacing
  },
  activityList: {
    paddingVertical: adjust(6), // Reduced like HomeScreen
    paddingHorizontal: adjust(12), // Match HomeScreen padding
  },
  activityItem: {
    backgroundColor: '#FFD859', // Keep original color
    borderRadius: adjust(12), // Match HomeScreen card radius
    paddingVertical: adjust(8), // Match HomeScreen button padding
    paddingHorizontal: adjust(12), // Match HomeScreen
    marginRight: adjust(8), // Match HomeScreen
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedActivityItem: {
    backgroundColor: '#FFB319', // Keep original color
  },
  activityIconContainer: {
    marginRight: adjust(6), // Match HomeScreen
  },
  activityName: {
    fontSize: adjust(12), // Match HomeScreen cardTitle
    fontWeight: '500',
    color: '#333',
  },
  planningCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Match HomeScreen
    padding: adjust(12), // Match HomeScreen card padding
    marginBottom: adjust(12), // Match HomeScreen card spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Match HomeScreen
    shadowOpacity: 0.08, // Match HomeScreen
    shadowRadius: 3, // Match HomeScreen
    elevation: 2, // Match HomeScreen
  },
  inputLabel: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(6), // Match HomeScreen
  },
  eventInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: adjust(8), // Match HomeScreen button radius
    padding: adjust(10), // Match HomeScreen
    fontSize: adjust(12), // Match HomeScreen
    color: '#333',
    marginBottom: adjust(12), // Match HomeScreen
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(12), // Match HomeScreen
  },
  dateTimeButtonText: {
    fontSize: adjust(12), // Match HomeScreen
    color: '#4361EE',
    fontWeight: '500',
    marginLeft: adjust(6), // Match HomeScreen
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(12), // Match HomeScreen
  },
  dateContainer: {
    flex: 1,
    marginRight: adjust(6), // Match HomeScreen
  },
  timeContainer: {
    flex: 1,
    marginLeft: adjust(6), // Match HomeScreen
  },
  dateTimeLabel: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
    marginBottom: adjust(4), // Match HomeScreen
  },
  dateTimeValue: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '500',
    color: '#333',
  },
  durationLabel: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8), // Match HomeScreen
  },
  durationOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(12), // Match HomeScreen
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: adjust(8), // Match HomeScreen button radius
    paddingVertical: adjust(8), // Match HomeScreen
    paddingHorizontal: adjust(8), // Match HomeScreen
    marginRight: adjust(8), // Match HomeScreen
    alignItems: 'center',
  },
  selectedDurationButton: {
    backgroundColor: '#4361EE',
  },
  durationButtonText: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
  },
  selectedDurationText: {
    color: '#fff',
    fontWeight: '500',
  },
  forecastSection: {
    marginBottom: adjust(12), // Match HomeScreen
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(10), // Match HomeScreen
  },
  forecastTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  forecastTitle: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(6), // Match HomeScreen
  },
  viewDetailsText: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#4361EE',
  },
  hourlyForecast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  forecastItem: {
    alignItems: 'center',
    flex: 1,
  },
  forecastTime: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
    marginBottom: adjust(4), // Match HomeScreen
  },
  forecastTemp: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '500',
    color: '#333',
    marginTop: adjust(4), // Match HomeScreen
  },
  assistantCard: {
    backgroundColor: '#517FE0',
    borderRadius: adjust(12), // Match HomeScreen
    padding: adjust(12), // Match HomeScreen
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: adjust(10), // Match HomeScreen
    marginBottom: adjust(12), // Match HomeScreen
  },
  assistantIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: adjust(16), // Match HomeScreen
    width: adjust(32), // Match HomeScreen
    height: adjust(32), // Match HomeScreen
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(10), // Match HomeScreen
  },
  assistantText: {
    color: '#fff',
    fontSize: adjust(12), // Match HomeScreen
    flex: 1,
    lineHeight: adjust(16), // Match HomeScreen
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
  // Modal styles - match HomeScreen modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Match HomeScreen
    width: '90%',
    padding: adjust(16), // Match HomeScreen
    maxWidth: adjust(320), // Keep a reasonable size
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Match HomeScreen
    shadowOpacity: 0.2, // Match HomeScreen
    shadowRadius: 3, // Match HomeScreen
    elevation: 3, // Match HomeScreen
  },
  customTimeModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Match HomeScreen
    padding: adjust(16), // Match HomeScreen
    width: '90%',
    maxWidth: adjust(320),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: adjust(12), // Match HomeScreen
    paddingBottom: adjust(10),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: adjust(14), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
  },
  modalContent: {
    paddingVertical: adjust(10),
  },
  closeButton: {
    width: adjust(24), // Match HomeScreen
    height: adjust(24), // Match HomeScreen
    borderRadius: adjust(12), // Match HomeScreen
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: adjust(14), // Match HomeScreen
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
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '500',
  },
  dateItemDate: {
    fontSize: adjust(14), // Match HomeScreen
    fontWeight: '600',
    marginVertical: adjust(2), // Match HomeScreen
  },
  dateItemMonth: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
  },
  selectedDateText: {
    color: '#fff',
  },
  timeSection: {
    marginBottom: adjust(12), // Match HomeScreen
  },
  timeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: adjust(12), // Match HomeScreen
  },
  timeSelectorUnit: {
    alignItems: 'center',
    marginHorizontal: adjust(8), // Match HomeScreen
  },
  timeAdjustButton: {
    width: adjust(36), // Match HomeScreen
    height: adjust(36), // Match HomeScreen
    borderRadius: adjust(18), // Match HomeScreen
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: adjust(4), // Match HomeScreen
  },
  timeValue: {
    fontSize: adjust(20), // Reduced from 24
    fontWeight: '600',
    color: '#333',
    marginVertical: adjust(4), // Match HomeScreen
    minWidth: adjust(36), // Match HomeScreen
    textAlign: 'center',
  },
  timeColon: {
    fontSize: adjust(20), // Reduced from 24
    fontWeight: '600',
    color: '#333',
  },
  ampmSelector: {
    flexDirection: 'column',
    marginLeft: adjust(16), // Match HomeScreen
  },
  ampmButton: {
    width: adjust(45), // Reduced 
    paddingVertical: adjust(6), // Match HomeScreen
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(8), // Match HomeScreen
    backgroundColor: '#f0f0f0',
    marginVertical: adjust(4), // Match HomeScreen
  },
  selectedAmpmButton: {
    backgroundColor: '#4361EE',
  },
  ampmButtonText: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '500',
    color: '#333',
  },
  selectedAmpmButtonText: {
    color: '#fff',
  },
  confirmButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(8), // Match HomeScreen
    paddingVertical: adjust(8), // Match HomeScreen
    alignItems: 'center',
    marginTop: adjust(12), // Match HomeScreen
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: adjust(11), // Match HomeScreen
    fontWeight: '600',
  },
  // Custom time picker styles
  customTimeContent: {
    marginBottom: adjust(12), // Match HomeScreen
  },
  customTimeLabel: {
    fontSize: adjust(12), // Match HomeScreen
    color: '#666',
    marginBottom: adjust(6), // Match HomeScreen
  },
  customTimeInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(8), // Match HomeScreen
  },
  customTimeInputContainer: {
    flex: 1,
    alignItems: 'center',
    maxWidth: '45%',
  },
  customTimeInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: adjust(8), // Match HomeScreen
    padding: adjust(8), // Match HomeScreen
    fontSize: adjust(12), // Match HomeScreen
    color: '#333',
    width: '100%',
  },
  customTimeUnit: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
    marginLeft: adjust(4), // Match HomeScreen
  },
  customTimeSeparator: {
    width: adjust(10),
    textAlign: 'center',
  },
  customTimeSeparatorText: {
    fontSize: adjust(12),
    color: '#666',
  },
  // Planned events section
  plannedEventsSection: {
    marginTop: adjust(8), // Match HomeScreen
    marginBottom: adjust(12), // Match HomeScreen
  },
  sectionTitleText: {
    fontSize: adjust(14), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8), // Match HomeScreen
  },
  plannedEventCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Match HomeScreen
    padding: adjust(12), // Match HomeScreen
    marginBottom: adjust(10), // Match HomeScreen
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Match HomeScreen
    shadowOpacity: 0.08, // Match HomeScreen
    shadowRadius: 3, // Match HomeScreen
    elevation: 2, // Match HomeScreen
  },
  plannedEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(6), // Match HomeScreen
  },
  plannedEventActivity: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
  },
  plannedEventDesc: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#666',
    marginBottom: adjust(8), // Match HomeScreen
  },
  plannedEventDetails: {
    flexDirection: 'column',
  },
  plannedEventDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: adjust(4), // Match HomeScreen
  },
  plannedEventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: adjust(8), // Match HomeScreen
    flexShrink: 1,
  },
  plannedEventDetailText: {
    fontSize: adjust(11), // Match HomeScreen
    color: '#333',
    marginLeft: adjust(4), // Match HomeScreen
    flexShrink: 1,
  },
  confirmEventButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(8), // Match HomeScreen
    paddingVertical: adjust(8), // Match HomeScreen
    alignItems: 'center',
    marginTop: adjust(12), // Match HomeScreen
  },
  confirmEventButtonText: {
    color: '#fff',
    fontSize: adjust(11), // Match HomeScreen
    fontWeight: '600',
  },
  weatherRecommendationModal: {
    backgroundColor: '#fff',
    borderRadius: adjust(12), // Match HomeScreen
    padding: adjust(16), // Match HomeScreen
    width: '90%',
    maxWidth: adjust(320),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, // Match HomeScreen
    shadowOpacity: 0.2, // Match HomeScreen
    shadowRadius: 3, // Match HomeScreen
    elevation: 3, // Match HomeScreen
  },
  weatherRecommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: adjust(12), // Match HomeScreen
    paddingBottom: adjust(8), // Match HomeScreen
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  weatherRecommendationTitle: {
    fontSize: adjust(14), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: adjust(16), // Match HomeScreen
  },
  loadingText: {
    color: '#333',
    fontSize: adjust(12), // Match HomeScreen
    marginTop: adjust(8), // Match HomeScreen
  },
  weatherRecommendationContent: {
    flex: 1,
  },
  weatherRecommendationText: {
    color: '#333',
    fontSize: adjust(12), // Match HomeScreen
    marginBottom: adjust(8), // Match HomeScreen
    lineHeight: adjust(16), // Match HomeScreen
  },
  betterTimesContainer: {
    marginTop: adjust(8), // Match HomeScreen
  },
  betterTimesTitle: {
    fontSize: adjust(12), // Match HomeScreen
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8), // Match HomeScreen
  },
  betterTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(4), // Match HomeScreen
  },
  betterTimeText: {
    color: '#333',
    fontSize: adjust(11), // Match HomeScreen
    marginLeft: adjust(4), // Match HomeScreen
  },
  closeRecommendationButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(8), // Match HomeScreen
    paddingVertical: adjust(8), // Match HomeScreen
    alignItems: 'center',
    marginTop: adjust(12), // Match HomeScreen
  },
  closeRecommendationButtonText: {
    color: '#fff',
    fontSize: adjust(11), // Match HomeScreen
    fontWeight: '600',
  },
  deleteButton: {
    width: adjust(24), // Match HomeScreen
    height: adjust(24), // Match HomeScreen
    borderRadius: adjust(12), // Match HomeScreen
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButton: {
    width: adjust(28), // Match HomeScreen
    height: adjust(28), // Match HomeScreen
    borderRadius: adjust(14), // Match HomeScreen
    backgroundColor: '#f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: adjust(12), // Match HomeScreen
    right: adjust(12), // Match HomeScreen
  },
});

export default PlanningScreen; 