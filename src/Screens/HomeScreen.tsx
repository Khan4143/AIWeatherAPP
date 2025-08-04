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
import type { RootStackParamList } from '../navigations/Navigations';
import { getMaterialWeatherIcon, getFeatherWeatherIcon } from '../services/weatherService';

// // Storage key for saved cities
// const SAVED_CITIES_KEY = 'skylar_saved_cities';

// // List of popular cities available in OpenWeather API
// const POPULAR_CITIES = [
//   'New York, US',
//   'Los Angeles, US',
//   'London, GB',
//   'Tokyo, JP',
//   'Paris, FR',
//   'Berlin, DE',
//   'Sydney, AU',
//   'Mumbai, IN',
//   'Beijing, CN',
//   'Rio de Janeiro, BR',
// ];

// Type definition for city objects
// interface CityObject {
//   key: string;
//   display: string;
// }

// // Helper function to get the time of day greeting
// const getGreeting = () => {
//   const hour = new Date().getHours();
//   if (hour < 12) return 'Good morning';
//   if (hour < 18) return 'Good afternoon';
//   return 'Good evening';
// };

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
  return getFeatherWeatherIcon(iconCode);
};

// Helper function to get MaterialCommunityIcons weather icons
const getWeatherIconMaterial = (iconCode: string) => {
  if (!iconCode) return 'weather-cloudy';
  
  // Log the icon code for debugging
  console.log('Weather icon code received:', iconCode);
  
  // Get the mapped icon
  const iconName = getMaterialWeatherIcon(iconCode);
  console.log('Mapped to icon:', iconName);
  return iconName;
};

// Helper to get appropriate icon color (same as ForecastScreen)
const getWeatherIconColor = (iconCode: string) => {
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
    paddingHorizontal: adjust(12),
    paddingBottom: adjust(80), // Add padding for tab bar
  },
  header: {
    marginTop: adjust(12), // Reduced from 10
    marginBottom: adjust(12), // Reduced from 15
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(10),
  },
  headerLocationText: {
    fontSize: adjust(14), // Reduced from 16
    fontWeight: '600',
    color: '#333',
    marginLeft: adjust(4), // Reduced from 5
    marginTop: adjust(1),
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

// Fixed row icons for outfit tips - each position has a specific icon
const OUTFIT_ROW_ICONS = [
  <MaterialCommunityIcons name="tshirt-crew" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // First row always clothing
  <MaterialCommunityIcons name="sunglasses" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Second row always accessories
  <MaterialCommunityIcons name="shoe-sneaker" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Third row always footwear
  <MaterialCommunityIcons name="umbrella" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Fourth row always umbrella
  <MaterialCommunityIcons name="hat-fedora" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Fifth row always hat
];

// Fixed row icons for health tips - each position has a specific icon
const HEALTH_ROW_ICONS = [
  <Ionicons name="water-outline" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // First row always hydration
  <MaterialCommunityIcons name="shield-sun" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Second row always protection
  <MaterialCommunityIcons name="run" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Third row always activity
  <MaterialCommunityIcons name="medical-bag" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Fourth row always medical
  <MaterialCommunityIcons name="weather-cloudy" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />, // Fifth row always weather
];

// Helper function to sort outfit tips based on their relevance to fixed icons
const sortOutfitTips = (tips: string[]) => {
  const categorizedTips: string[][] = [[], [], [], [], []]; // One array for each icon type
  
  tips.forEach(tip => {
    const tipLower = tip.toLowerCase();
    if (tipLower.includes('fabric') || tipLower.includes('wear') || tipLower.includes('cloth') || tipLower.includes('light') || tipLower.includes('breathable')) {
      categorizedTips[0].push(tip); // Clothing tips
    } else if (tipLower.includes('sunglass') || tipLower.includes('eyes') || tipLower.includes('sun')) {
      categorizedTips[1].push(tip); // Sunglasses tips
    } else if (tipLower.includes('shoe') || tipLower.includes('footwear') || tipLower.includes('walking')) {
      categorizedTips[2].push(tip); // Footwear tips
    } else if (tipLower.includes('umbrella') || tipLower.includes('rain') || tipLower.includes('shower')) {
      categorizedTips[3].push(tip); // Umbrella tips
    } else if (tipLower.includes('hat') || tipLower.includes('cap')) {
      categorizedTips[4].push(tip); // Hat tips
    } else {
      categorizedTips[0].push(tip); // Default to clothing category
    }
  });

  // Take first tip from each category, if exists
  return categorizedTips.map((categoryTips, index) => 
    categoryTips.length > 0 ? categoryTips[0] : `Consider appropriate ${index === 0 ? 'clothing' : index === 1 ? 'eye protection' : index === 2 ? 'footwear' : index === 3 ? 'rain protection' : 'headwear'}`
  );
};

// Helper function to sort health tips based on their relevance to fixed icons
const sortHealthTips = (tips: string[]) => {
  const categorizedTips: string[][] = [[], [], [], [], []]; // One array for each icon type
  
  tips.forEach(tip => {
    const tipLower = tip.toLowerCase();
    if (tipLower.includes('hydrat') || tipLower.includes('water') || tipLower.includes('drink')) {
      categorizedTips[0].push(tip); // Hydration tips
    } else if (tipLower.includes('protect') || tipLower.includes('sun') || tipLower.includes('uv') || tipLower.includes('screen')) {
      categorizedTips[1].push(tip); // Protection tips
    } else if (tipLower.includes('break') || tipLower.includes('walk') || tipLower.includes('outdoor') || tipLower.includes('activity')) {
      categorizedTips[2].push(tip); // Activity tips
    } else if (tipLower.includes('medical') || tipLower.includes('health') || tipLower.includes('condition')) {
      categorizedTips[3].push(tip); // Medical tips
    } else if (tipLower.includes('weather') || tipLower.includes('cloud') || tipLower.includes('temperature')) {
      categorizedTips[4].push(tip); // Weather tips
    } else {
      categorizedTips[2].push(tip); // Default to activity category
    }
  });

  // Take first tip from each category, if exists
  return categorizedTips.map((categoryTips, index) => 
    categoryTips.length > 0 ? categoryTips[0] : `Monitor your ${index === 0 ? 'hydration' : index === 1 ? 'sun exposure' : index === 2 ? 'activity level' : index === 3 ? 'health' : 'weather conditions'}`
  );
};

// Use the imported RootStackParamList
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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
    console.log('🔄 HomeScreen useEffect triggered - weatherSignature:', weatherSignature);
    
    const fetchOutfitCard = async () => {
      if (currentWeather) {
        const now = Date.now();
        // More aggressive caching - only fetch if we have no data or it's been more than 2 hours
        const shouldFetchOutfit = !outfitCardText || 
          outfitCardText.includes('Unable to fetch') || 
          (now - lastOutfitUpdate > twoHoursMs);
        
        if (shouldFetchOutfit) {
          console.log('🔄 Fetching outfit card...');
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
          console.log("⏭️ Skipping outfit card update, using cached data");
        }
      }
    };
    const fetchHealthCard = async () => {
      if (currentWeather) {
        const now = Date.now();
        // More aggressive caching - only fetch if we have no data or it's been more than 2 hours
        const shouldFetchHealth = !healthCardText || 
          healthCardText.includes('Unable to fetch') || 
          (now - lastHealthUpdate > twoHoursMs);
        
        if (shouldFetchHealth) {
          console.log('🔄 Fetching health card...');
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
          console.log("⏭️ Skipping health card update, using cached data");
        }
      }
    };
    fetchOutfitCard();
    fetchHealthCard();
  }, [weatherSignature]); // Use weatherSignature instead of individual weather properties

  // Fetch Gemini responses only when weather changes
  useEffect(() => {
    if (!currentWeather) return;
    let cancelled = false;
    let isFetchingDetailed = false;

    // Define a threshold for when we should refresh the data
    const now = Date.now();
    
    // Only fetch new data if it's been more than 3 hours or we don't have data yet
    if ((now - lastUpdateRef.current > (3 * 60 * 60 * 1000) || !outfitGemini || !healthGemini) && !isFetchingDetailed) {
      console.log('🔄 Fetching detailed tips...');
      lastUpdateRef.current = now;
      isFetchingDetailed = true;
      
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
      console.log("⏭️ Skipping detailed tips update, using cached data");
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
              {(() => {
                const currentHourData = getCurrentHourForecast();
                const dailyData = forecast?.daily?.[0];
                
                return (
                  <>
                    <Text style={styles.modalText}>
                      Current temperature is {currentHourData?.temperature.day.toFixed(1) || '--'}°<Text>{currentHourData?.windSpeed ? ` with ${currentHourData.windSpeed < 10 ? 'light' : 'strong'} wind (${currentHourData.windSpeed.toFixed(1)}mph)` : ''}</Text>
                    </Text>
                    <View style={styles.modalItem}>
                      <Feather name="droplet" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                      <Text style={styles.modalItemText}>Humidity: {currentHourData?.humidity || 65}%</Text>
                    </View>
                    <View style={styles.modalItem}>
                      <Feather name="thermometer" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                      <Text style={styles.modalItemText}>Feels like: {currentHourData?.feelsLike.day.toFixed(1) || 74}°</Text>
                    </View>
                    <View style={styles.modalItem}>
                      <MaterialCommunityIcons name="weather-sunset-up" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                      <Text style={styles.modalItemText}>Sunrise: {dailyData?.sunrise ? formatTime(dailyData.sunrise) : '6:24 AM'}</Text>
                    </View>
                    <View style={styles.modalItem}>
                      <MaterialCommunityIcons name="weather-sunset-down" size={adjust(14)} color="#4361EE" style={styles.modalItemIcon} />
                      <Text style={styles.modalItemText}>Sunset: {dailyData?.sunset ? formatTime(dailyData.sunset) : '8:15 PM'}</Text>
                    </View>
                  </>
                );
              })()}
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
                  sortOutfitTips(outfitGemini.split(/[.\n\r]+/).filter(Boolean)).map((tip, idx) => {
                    // Remove leading *, -, or whitespace
                    const cleanTip = tip.replace(/^\s*[*-]\s*/, '').trim();
                    return (
                      <View key={idx} style={styles.modalItem}>
                        {OUTFIT_ROW_ICONS[idx]}
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
                  sortHealthTips(healthGemini.split(/[.\n\r]+/).filter(Boolean)).map((tip, idx) => {
                    // Remove leading *, -, or whitespace
                    const cleanTip = tip.replace(/^\s*[*-]\s*/, '').trim();
                    return (
                      <View key={idx} style={styles.modalItem}>
                        {HEALTH_ROW_ICONS[idx]}
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
    if (!forecast) return { high: '--', low: '--' };
    
    // If we have forecast data, extract the real min/max for today
    if (forecast.daily && forecast.daily.length > 0) {
      const todayForecast = forecast.daily[0];
      if (todayForecast.temperature.max !== todayForecast.temperature.min) {
        return {
          high: todayForecast.temperature.max.toFixed(0),
          low: todayForecast.temperature.min.toFixed(0)
        };
      }
    }
    
    // If min and max temps are the same or not meaningful,
    // create a range around the current hour's temperature
    const currentHourData = getCurrentHourForecast();
    if (currentHourData) {
      const baseTemp = currentHourData.temperature.day;
      const variation = Math.max(2, baseTemp * 0.1); // Use at least 2 degrees variation
      
      return {
        high: Math.round(baseTemp + variation).toString(),
        low: Math.round(baseTemp - variation).toString()
      };
    }
    
    return { high: '--', low: '--' };
  };

  // Update the handleLocationPress function
  const handleLocationPress = () => {
    navigation.navigate('Forecast', { 
      openCityModal: true,
      fromHomeScreen: true 
    });
  };

  if (isLoading && !forecast) {
    return (
      <View style={{ flex: 1, paddingBottom: adjust(85) }}>
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

  // Get current hour's forecast data
  const getCurrentHourForecast = () => {
    if (!forecast?.hourly || forecast.hourly.length === 0) return null;
    
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find the forecast entry for the current hour
    const currentHourForecast = forecast.hourly.find(hour => {
      const hourDate = new Date(hour.date * 1000);
      return hourDate.getHours() === currentHour;
    });
    
    // If not found, return the first hour (closest to current time)
    return currentHourForecast || forecast.hourly[0];
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

  // Determine weather description for info card based on current hour's forecast
  const getWeatherDescription = () => {
    const currentHourData = getCurrentHourForecast();
    if (!currentHourData) return <Text style={styles.infoText}>Perfect weather for your day!</Text>;
    
    const temp = currentHourData.temperature.day;
    const windSpeed = currentHourData.windSpeed || 0;
    const description = currentHourData.weather.description || '';
    const icon = currentHourData.weather.icon || '';
    
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
                {forecast?.location ? `${forecast.location}` : "Loading location..."}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weather Card */}
          <View style={styles.weatherCard}>
            {/* Weather Icon and Description - Top Right */}
            <View style={styles.weatherIconContainer}>
              {(() => {
                const currentHourData = getCurrentHourForecast();
                if (currentHourData) {
                  return (
                    <>
                      <MaterialCommunityIcons 
                        name={getWeatherIconMaterial(currentHourData.weather.icon)} 
                        size={adjust(55)} 
                        color={getWeatherIconColor(currentHourData.weather.icon)} 
                      />
                      <Text style={styles.weatherDescription}>
                        {getAccurateWeatherDescription(currentHourData.weather.icon)}
                      </Text>
                    </>
                  );
                } else {
                  return (
                    <>
                      <MaterialCommunityIcons 
                        name="weather-partly-cloudy" 
                        size={adjust(50)} 
                        color="#A9A9A9" 
                      />
                      <Text style={styles.weatherDescription}>
                        Loading...
                      </Text>
                    </>
                  );
                }
              })()}
            </View>

            {/* Current temperature */}
            <View style={styles.currentTemp}>
              <Text style={styles.tempValue}>
                {(() => {
                  const currentHourData = getCurrentHourForecast();
                  return currentHourData ? `${currentHourData.temperature.day.toFixed(0)}°${tempUnit}` : `--°${tempUnit}`;
                })()}
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
                {forecast.hourly.slice(0, 24).map((hour, index) => {
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
                  {forecast?.location ? `Weather in ${forecast.location}, ${forecast.country}` : "Loading location data..."}
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
              <Text style={styles.cardTitle}>Health Tips</Text>
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

export default HomeScreen;