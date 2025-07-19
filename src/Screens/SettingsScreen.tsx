import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Switch,
  TextInput,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';
import adjust from '../utils/adjust';
import { StackNavigationProp } from '@react-navigation/stack';
import { UserDataManager } from '../utils/userDataManager';
import { PreferenceData } from '../Screens/PreferenceScreen';
import { UserData } from '../Screens/UserInfo';
import { DailyRoutineData } from '../Screens/DailyRoutine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateCity } from '../services/weatherService';
import debounce from 'lodash/debounce';

// Storage keys (should match UserDataManager's keys)
const STORAGE_KEYS = {
  USER_PROFILE: 'skylar_user_profile',
  DAILY_ROUTINE: 'skylar_daily_routine',
  PREFERENCES: 'skylar_preferences',
};

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyAJcSmb8jAEU5qVlzR3sTRcraWxb38B31w';

// Define interfaces for user data
interface UserDataType {
  age: string;
  gender: string;
  occupation: string;
  location: string;
  name?: string;
}

interface DailyRoutineType {
  morningActivity: string | null;
  commuteMethod: string | null;
  commuteTime: {
    hours: number;
    minutes: number;
    isAM: boolean;
  };
  eveningActivity: string | null;
  selectedActivity: string | null;
  activities: string[];
}

interface PreferenceDataType {
  style: string | null;
  healthConcerns: string[];
  activities: string[];
}

type SettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

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
  'Cairo, EG',
  'Moscow, RU',
  'Toronto, CA',
  'Rome, IT',
  'Madrid, ES',
  'Amsterdam, NL',
  'Dubai, AE',
  'Mexico City, MX',
  'Bangkok, TH',
  'Singapore, SG',
];

const API_KEY = '87b449b894656bb5d85c61981ace7d25';

// Add type definition for city objects
interface CityObject {
  key: string;
  display: string;
}

const SettingsScreen = ({ navigation }: SettingsScreenProps) => {
  // State for modal visibility
  const [modalVisible, setModalVisible] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  
  // State for toggle switches
  const [useCelsius, setUseCelsius] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // State for user data
  const [userData, setUserData] = useState<UserDataType>({
    age: '',
    gender: '',
    occupation: '',
    location: '',
    name: '',
  });
  
  const [routineData, setRoutineData] = useState<DailyRoutineType>({
    morningActivity: null,
    commuteMethod: null,
    commuteTime: {
      hours: 8,
      minutes: 0,
      isAM: true,
    },
    eveningActivity: null,
    selectedActivity: null,
    activities: [],
  });
  
  const [preferenceData, setPreferenceData] = useState<PreferenceDataType>({
    style: null,
    healthConcerns: [],
    activities: [],
  });
  
  // State for personal information
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  
  // Style options for preferences
  const styleOptions = [
    { id: 'casual', label: 'Casual', description: 'Relaxed daily outfits' },
    { id: 'professional', label: 'Professional', description: 'Office/formal attire' },
    { id: 'sporty', label: 'Sporty', description: 'Activewear or outdoor gear' },
  ];
  
  // Commute options
  const commuteOptions = [
    { id: 'car', label: 'Car', icon: 'car-outline' },
    { id: 'bus', label: 'Bus', icon: 'bus-outline' },
    { id: 'train', label: 'Train', icon: 'train-outline' },
    { id: 'bicycle', label: 'Bicycle', icon: 'bicycle-outline' },
    { id: 'walk', label: 'Walk', icon: 'walk-outline' },
  ];
  
  // Activity options
  const morningActivities = [
    { id: 'running', label: 'Running', icon: 'run' },
    { id: 'gym', label: 'Gym', icon: 'dumbbell' },
    { id: 'yoga', label: 'Yoga', icon: 'yoga' },
    { id: 'dogwalk_morning', label: 'Dog Walk', icon: 'dog' },
  ];
  
  const eveningActivities = [
    { id: 'sports', label: 'Sports', icon: 'basketball' },
    { id: 'gardening', label: 'Gardening', icon: 'flower' },
    { id: 'dogwalk', label: 'Dog Walk', icon: 'dog' },
    { id: 'social', label: 'Social Events', icon: 'account-group' },
    { id: 'movie', label: 'Netflix/Movie', icon: 'movie-open' },
    { id: 'reading', label: 'Reading', icon: 'book-open-variant' },
  ];
  
  // Health concern options
  const healthOptions = [
    { id: 'allergies', label: 'Allergies' },
    { id: 'asthma', label: 'Asthma' },
    { id: 'sensitivity', label: 'Sensitivity' },
    { id: 'migraine', label: 'Migraine' },
    { id: 'arthritis', label: 'Arthritis' },
    { id: 'skin', label: 'Skin Issues' },
    { id: 'heart', label: 'Heart Issues' },
  ];
  
  // Activity preference options
  const activityPreferences = [
    { id: 'bbq', label: 'BBQ' },
    { id: 'hiking', label: 'Hiking' },
    { id: 'outdoor', label: 'Outdoor Party' },
    { id: 'beach', label: 'Beach' },
    { id: 'camping', label: 'Camping' },
    { id: 'sports', label: 'Sports' },
    { id: 'gardening', label: 'Gardening' },
    { id: 'cycling', label: 'Cycling' },
  ];
  
  // State for editing routine
  const [selectedMorningActivity, setSelectedMorningActivity] = useState<string | null>(null);
  const [selectedCommuteMethod, setSelectedCommuteMethod] = useState<string | null>(null);
  const [commuteHours, setCommuteHours] = useState(8);
  const [commuteMinutes, setCommuteMinutes] = useState(0);
  const [isAM, setIsAM] = useState(true);
  const [selectedEveningActivities, setSelectedEveningActivities] = useState<string[]>([]);
  
  // State for editing preferences
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedHealthConcerns, setSelectedHealthConcerns] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  
  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Add state for location suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<CityObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const locationInputRef = useRef<TextInput>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const formScrollViewRef = useRef<ScrollView>(null);
  const [placesResults, setPlacesResults] = useState<any[]>([]);
  const [isPlacesLoading, setIsPlacesLoading] = useState(false);
  
  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Add keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Load all user data from UserDataManager
  const loadUserData = async () => {
    try {
      // Ensure we have the latest data from AsyncStorage
      await UserDataManager.loadAllData();
      const allData = UserDataManager.getAllUserData();
      
      console.log("SettingsScreen loading data:", JSON.stringify(allData, null, 2));
      
      if (allData.profile) {
        const profile = allData.profile as UserDataType;
        // Create a new object to avoid reference issues
        setUserData({...profile});
        setName(profile.name || '');
        setAge(profile.age || '');
        setGender(profile.gender || '');
        setOccupation(profile.occupation || '');
        setLocation(profile.location || '');
        console.log("Loaded profile in settings:", profile);
      }
      
      if (allData.dailyRoutine) {
        const routine = allData.dailyRoutine as DailyRoutineType;
        // Create a new object with a deep copy of the routine data
        setRoutineData(JSON.parse(JSON.stringify(routine)));
        
        // Set form state for routine
        setSelectedMorningActivity(routine.morningActivity ? getMorningActivityId(routine.morningActivity) : null);
        setSelectedCommuteMethod(routine.commuteMethod);
        if (routine.commuteTime) {
          setCommuteHours(routine.commuteTime.hours);
          setCommuteMinutes(routine.commuteTime.minutes);
          setIsAM(routine.commuteTime.isAM);
        }
        
        // Handle empty activities array
        const activities = Array.isArray(routine.activities) ? routine.activities : [];
        
        const eveningActivitiesIds = activities
          .filter(activity => 
            ['Sports', 'Gardening', 'Dog Walk', 'Social Events', 'Netflix/Movie', 'Reading']
            .includes(activity))
          .map(activity => getEveningActivityId(activity));
        
        setSelectedEveningActivities(eveningActivitiesIds);
      }
      
      if (allData.preferences) {
        const preferences = allData.preferences as PreferenceDataType;
        // Create a new object with a deep copy of preferences
        setPreferenceData(JSON.parse(JSON.stringify(preferences)));
        
        setSelectedStyle(preferences.style);
        
        // Handle empty arrays properly
        const healthConcerns = Array.isArray(preferences.healthConcerns) ? 
          preferences.healthConcerns.filter(concern => concern && concern !== '') : [];
        const activities = Array.isArray(preferences.activities) ? 
          preferences.activities.filter(activity => activity && activity !== '') : [];
        
        console.log('Loading preferences in Settings:', preferences);
        console.log('Health concerns found:', JSON.stringify(healthConcerns));
        console.log('Activities found:', JSON.stringify(activities));
        
        // Map display names to IDs, removing any that resolve to empty strings
        const healthConcernIds = healthConcerns
          .map(concern => getHealthConcernId(concern))
          .filter(id => id !== '');
        const activityIds = activities
          .map(activity => getActivityPreferenceId(activity))
          .filter(id => id !== '');
        
        console.log('Health concern IDs:', JSON.stringify(healthConcernIds));
        console.log('Activity IDs:', JSON.stringify(activityIds));
        
        setSelectedHealthConcerns(healthConcernIds);
        setSelectedActivities(activityIds);
      }
      
    } catch (error) {
      console.error('Error loading user data in settings:', error);
    }
  };
  
  // Helper functions to map between display names and IDs
  const getMorningActivityId = (displayName: string): string => {
    const activity = morningActivities.find(a => a.label === displayName);
    return activity ? activity.id : '';
  };
  
  const getEveningActivityId = (displayName: string): string => {
    const activity = eveningActivities.find(a => a.label === displayName);
    return activity ? activity.id : '';
  };
  
  const getHealthConcernId = (displayName: string): string => {
    const concern = healthOptions.find(c => c.label === displayName);
    return concern ? concern.id : '';
  };
  
  const getActivityPreferenceId = (displayName: string): string => {
    const activity = activityPreferences.find(a => a.label === displayName);
    return activity ? activity.id : '';
  };
  
  // Helper to toggle morning activity
  const toggleMorningActivity = (activityId: string) => {
    setSelectedMorningActivity(
      selectedMorningActivity === activityId ? null : activityId
    );
  };
  
  // Function to handle back navigation
  const handleBack = () => {
    // First save any pending changes
    console.log("===== SETTINGS SCREEN: Navigating back to Profile screen =====");
    
    UserDataManager.saveAllData().then(() => {
      console.log('SETTINGS - All data saved before navigating back to Profile screen');
      
      // Force a small delay to ensure AsyncStorage has completed the write operation
      setTimeout(() => {
        // Use goBack() instead of navigate with an explicit screen name
        navigation.goBack();
      }, 100);
    }).catch(error => {
      console.error('SETTINGS - Error saving data before navigation:', error);
      // Navigate anyway after a slight delay
      setTimeout(() => navigation.goBack(), 100);
    });
  };
  
  // Function to open settings modal
  const openSettingsModal = (modalType: string) => {
    setActiveModal(modalType);
    setModalVisible(true);
  };
  
  // Function to close modal
  const closeModal = () => {
    // Save all data when closing modal to ensure consistency
    UserDataManager.saveAllData().catch(error => {
      console.error('Error saving data when closing modal:', error);
    });
    
    setModalVisible(false);
  };
  
  // Fix the toast animation logic to avoid the useInsertionEffect error
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    fadeAnim.setValue(0);
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    // Auto hide after 2 seconds using timeout only
    const timer = setTimeout(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Hide toast after animation duration
      const hideTimer = setTimeout(() => {
        setToastVisible(false);
      }, 300);
      
      // Clean up the hide timer in case component unmounts
      return () => clearTimeout(hideTimer);
    }, 2000);
    
    // Clean up the main timer in case component unmounts
    return () => clearTimeout(timer);
  };
  
  // Function to save personal information
  const savePersonalInfo = async () => {
    // Hide keyboard when saving
    Keyboard.dismiss();
    
    try {
      console.log("===== SETTINGS SCREEN: Saving personal information =====");
      
      // Get current data
      const userData = UserDataManager.getAllUserData();
      
      // Create a new profile object with updated values
      const updatedProfile = {
        ...userData.profile,
        name,
        age,
        gender,
        occupation,
        location
      };
      
      console.log("SETTINGS - Saving updated profile:", JSON.stringify(updatedProfile, null, 2));
      
      // Update the data using setAll method - THIS IS THE KEY FIX
      UserData.setAll(updatedProfile);
      
      // Save to AsyncStorage
      await UserDataManager.saveUserProfile();
      
      // Force a save of all data to ensure consistency
      await UserDataManager.saveAllData();
      
      // Verify the data was saved correctly in memory
      const savedProfile = UserDataManager.getUserProfile();
      console.log("SETTINGS - Profile after save in memory:", JSON.stringify(savedProfile, null, 2));
      
      // Verify the data was saved correctly in AsyncStorage
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        console.log("SETTINGS - Profile saved to AsyncStorage:", profileJson);
      } else {
        console.warn("SETTINGS - No profile data found in AsyncStorage after save!");
      }
      
      // Show custom toast instead of Alert
      showToast('Personal information updated successfully');
      closeModal();
    } catch (error) {
      console.error('SETTINGS - Error saving personal information:', error);
      showToast('Failed to save personal information', 'error');
    }
  };
  
  // Function to save daily routine
  const saveDailyRoutine = async () => {
    try {
      console.log("===== SETTINGS SCREEN: Saving daily routine =====");
      
      // Get current data
      const userData = UserDataManager.getAllUserData();
      
      // Map IDs to labels
      const morningActivity = morningActivities.find(a => a.id === selectedMorningActivity)?.label || null;
      
      const eveningActivitiesLabels = selectedEveningActivities.map(id => {
        const match = eveningActivities.find(a => a.id === id);
        return match ? match.label : null;
      }).filter(label => label !== null) as string[];
      
      // Create updated routine data
      const updatedRoutineData = {
        ...userData.dailyRoutine,
        morningActivity,
        commuteMethod: selectedCommuteMethod,
        commuteTime: {
          hours: commuteHours,
          minutes: commuteMinutes,
          isAM
        },
        eveningActivity: eveningActivitiesLabels[0] || null,
        activities: [
          ...(morningActivity ? [morningActivity] : []),
          ...eveningActivitiesLabels
        ]
      };
      
      console.log("SETTINGS - Saving daily routine:", JSON.stringify(updatedRoutineData, null, 2));
      console.log("SETTINGS - Activities being saved:", JSON.stringify(updatedRoutineData.activities, null, 2));
      
      // Update data using setAll method - THIS IS THE KEY FIX
      DailyRoutineData.setAll(updatedRoutineData);
      
      // Save to storage
      await UserDataManager.saveDailyRoutine();
      
      // Force a save of all data to ensure consistency
      await UserDataManager.saveAllData();
      
      // Verify the data was saved correctly in memory
      const savedRoutine = UserDataManager.getDailyRoutine();
      console.log("SETTINGS - Daily routine after save in memory:", JSON.stringify(savedRoutine, null, 2));
      
      // Verify the data was saved correctly in AsyncStorage
      const routineJson = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_ROUTINE);
      if (routineJson) {
        console.log("SETTINGS - Daily routine saved to AsyncStorage:", routineJson);
      } else {
        console.warn("SETTINGS - No daily routine data found in AsyncStorage after save!");
      }
      
      // Show custom toast instead of Alert
      showToast('Daily routine updated successfully');
      closeModal();
    } catch (error) {
      console.error('SETTINGS - Error saving daily routine:', error);
      showToast('Failed to save daily routine', 'error');
    }
  };
  
  // Function to save preferences
  const savePreferences = async () => {
    try {
      console.log("===== SETTINGS SCREEN: Saving preferences =====");
      
      // Get current preferences data directly from UserDataManager to preserve structure
      const currentPreferences = UserDataManager.getPreferences();
      
      // Map IDs to display names for health concerns - filter out any empty strings
      const healthConcernNames = selectedHealthConcerns
        .filter(id => id && id !== '')
        .map(id => {
          const concern = healthOptions.find(c => c.id === id);
          return concern ? concern.label : '';
        })
        .filter(name => name !== '');
      
      // Map IDs to display names for activities - filter out any empty strings
      const activityNames = selectedActivities
        .filter(id => id && id !== '')
        .map(id => {
          const activity = activityPreferences.find(a => a.id === id);
          return activity ? activity.label : '';
        })
        .filter(name => name !== '');
      
      // // Log what we're saving for debugging
      // console.log('SETTINGS - Selected health concerns IDs:', JSON.stringify(selectedHealthConcerns));
      // console.log('SETTINGS - Health concerns being saved:', JSON.stringify(healthConcernNames));
      // console.log('SETTINGS - Selected activities IDs:', JSON.stringify(selectedActivities));
      // console.log('SETTINGS - Activities being saved:', JSON.stringify(activityNames));
      
      // Create a NEW updated preferences object with a deep copy
      const updatedPreferences = {
        ...JSON.parse(JSON.stringify(currentPreferences)), // Deep copy to avoid reference issues
        style: selectedStyle,
        healthConcerns: [...healthConcernNames],
        activities: [...activityNames],
      };
      
      console.log('SETTINGS - Full preferences object being saved:', JSON.stringify(updatedPreferences, null, 2));
      
      // Create a completely new copy in memory to avoid reference issues
      PreferenceData.setAll(updatedPreferences);
      
      // Verify the update
      const afterUpdate = UserDataManager.getPreferences();
      console.log('SETTINGS - Preferences after update in memory:', JSON.stringify(afterUpdate, null, 2));
      
      // Save to storage
      await UserDataManager.savePreferences();
      
      // Force a save of all data to ensure consistency
      await UserDataManager.saveAllData();
      
      // Verify the data was saved correctly in AsyncStorage
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (preferencesJson) {
        console.log("SETTINGS - Preferences saved to AsyncStorage:", preferencesJson);
      } else {
        console.warn("SETTINGS - No preferences data found in AsyncStorage after save!");
      }
      
      // Show custom toast instead of Alert
      showToast('Preferences updated successfully');
      closeModal();
    } catch (error) {
      console.error('SETTINGS - Error saving preferences:', error);
      showToast('Failed to save preferences', 'error');
    }
  };
  
  // Helper function to toggle health concern selection
  const toggleHealthConcern = (concernId: string) => {
    console.log('Toggling health concern:', concernId);
    console.log('Current selections:', selectedHealthConcerns);
    
    setSelectedHealthConcerns(prev => {
      // Directly modify state with new array references
      if (prev.includes(concernId)) {
        // If already selected, create a new array without this item
        const newSelections = prev.filter(id => id !== concernId);
        console.log('Deselected. New selections:', newSelections);
        return newSelections;
      } else {
        // If not selected and under limit, add to selections
        if (prev.length < 3) {
          const newSelections = [...prev, concernId];
          console.log('Selected. New selections:', newSelections);
          return newSelections;
        }
        console.log('Already at max selections');
        return prev;
      }
    });
  };
  
  // Helper function to toggle activity selection
  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        // Limit to 3 selections
        if (prev.length < 3) {
          return [...prev, activityId];
        }
        return prev; // Already at max selections
      }
    });
  };
  
  // Helper function to toggle evening activity selection
  const toggleEveningActivity = (activityId: string) => {
    setSelectedEveningActivities(prev => {
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        // Limit to 2 selections
        if (prev.length < 2) {
          return [...prev, activityId];
        }
        return prev;
      }
    });
  };
  
  // Function to navigate to specific onboarding screen - we'll remove this in favor of in-place editing
  const navigateToOnboarding = (screenName: string) => {
    closeModal();
    navigation.navigate(screenName, { fromSettings: true });
  };
  
  // Fetch city suggestions from OpenWeatherMap API
  const fetchCitySuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setCitySuggestions([]);
      return;
    }

    // First check our static list for partial matches
    const staticMatches: CityObject[] = POPULAR_CITIES.filter(city => 
      city.toLowerCase().includes(query.toLowerCase())
    ).map((city, index) => ({
      key: `static-${city}-${index}`,
      display: city
    }));
    
    // If we have matches in our static list, show them immediately
    if (staticMatches.length > 0) {
      setCitySuggestions(staticMatches);
      
      // If we have sufficient local matches, we might not need the API request
      if (staticMatches.length >= 3) {
        return;
      }
    }

    setIsLoading(true);
    try {
      // Use a wildcard approach for the API call by adding an asterisk
      // This makes the query more lenient for partial matches
      const searchTerm = query.endsWith('*') ? query : `${query}*`;
      
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(searchTerm)}&limit=15&appid=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }

      const data = await response.json();
      
      // Format results as "City, Country Code" and add index to ensure uniqueness
      if (data && data.length > 0) {
        // Create formatted cities array
        const formattedCities: CityObject[] = data.map((item: any, index: number) => ({
          key: `${item.name}-${item.country}-${index}`,
          display: `${item.name}, ${item.country}`
        }));

        // Filter the results to prioritize exact matches and ensure we get the best results
        const exactMatches: CityObject[] = formattedCities.filter((city: CityObject) => 
          city.display.toLowerCase().includes(query.toLowerCase())
        );
        
        // Validate cities against the OpenWeather API to ensure they exist
        const validatedMatches: CityObject[] = [];
        const validationPromises = exactMatches.map(async (city: CityObject) => {
          const isValid = await validateCity(city.display);
          if (isValid) {
            validatedMatches.push(city);
          }
        });
        
        // Wait for all validation checks to complete
        await Promise.all(validationPromises);
        
        // Combine with our static matches (which we assume are valid) and deduplicate
        const allMatches: CityObject[] = [...validatedMatches];
        
        // Only add static matches if they don't appear to be duplicates
        for (const staticCity of staticMatches) {
          const isDuplicate = allMatches.some((city: CityObject) => 
            city.display.toLowerCase() === staticCity.display.toLowerCase()
          );
          if (!isDuplicate) {
            // Validate static city to ensure it exists in OpenWeather API
            const isValid = await validateCity(staticCity.display);
            if (isValid) {
              allMatches.push(staticCity);
            }
          }
        }
        
        setCitySuggestions(allMatches.slice(0, 10)); // Limit to 10 results
      } else {
        // Fall back to our static matches if the API returns nothing
        // But still validate them
        const validatedStaticMatches: CityObject[] = [];
        const validationPromises = staticMatches.map(async (city: CityObject) => {
          const isValid = await validateCity(city.display);
          if (isValid) {
            validatedStaticMatches.push(city);
          }
        });
        
        await Promise.all(validationPromises);
        setCitySuggestions(validatedStaticMatches);
      }
    } catch (error) {
      // When an error occurs, still show any static matches we have
      // But validate them first if possible
      try {
        const validatedStaticMatches: CityObject[] = [];
        const validationPromises = staticMatches.map(async (city: CityObject) => {
          try {
            const isValid = await validateCity(city.display);
            if (isValid) {
              validatedStaticMatches.push(city);
            }
          } catch (err) {
            // If validation fails, just use the static city anyway
            validatedStaticMatches.push(city);
          }
        });
        
        await Promise.all(validationPromises);
        setCitySuggestions(validatedStaticMatches);
      } catch (validationError) {
        // If all else fails, just use the static matches
        setCitySuggestions(staticMatches);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
  const handleLocationTextChange = (text: string) => {
    setLocation(text);
    
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
        
        // Update location
        setLocation(formattedAddress || description);
        setShowCitySuggestions(false);
      }
    } catch (error) {
      console.error('Error selecting place:', error);
    }
  };

  // Handle focus on location input to scroll the form into view
  const handleLocationFocus = () => {
    // Use a simpler approach to scroll the form - just use a fixed offset
    setTimeout(() => {
      if (formScrollViewRef.current) {
        formScrollViewRef.current.scrollTo({
          y: 300, // Use a fixed offset to ensure the field is visible
          animated: true,
        });
      }
    }, 300);
  };

  // Handle city selection
  const handleCitySelect = (cityObj: {key: string, display: string}) => {
    setLocation(cityObj.display);
    setSearchQuery('');
    setShowCitySuggestions(false);
  };
  
  // Render modal content based on active modal type
  const renderModalContent = () => {
    switch (activeModal) {
      case 'personalInfo':
        return (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Information</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={adjust(22)} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              ref={formScrollViewRef}
              showsVerticalScrollIndicator={false} 
              style={[styles.formScrollView, keyboardVisible && styles.formScrollViewExtended]}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                />
              </View>
              
              {/* Age Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Age</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your age"
                  placeholderTextColor="#999"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>
              
              {/* Gender Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Gender</Text>
                <View style={styles.optionsRow}>
                  <TouchableOpacity 
                    style={[styles.optionButton, gender === 'male' && styles.selectedOptionButton]}
                    onPress={() => setGender('male')}
                  >
                    <Text style={[styles.optionText, gender === 'male' && styles.selectedOptionText]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.optionButton, gender === 'female' && styles.selectedOptionButton]}
                    onPress={() => setGender('female')}
                  >
                    <Text style={[styles.optionText, gender === 'female' && styles.selectedOptionText]}>Female</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.optionButton, gender === 'other' && styles.selectedOptionButton]}
                    onPress={() => setGender('other')}
                  >
                    <Text style={[styles.optionText, gender === 'other' && styles.selectedOptionText]}>Other</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {/* Occupation Input */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Occupation</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter your occupation"
                  placeholderTextColor="#999"
                  value={occupation}
                  onChangeText={setOccupation}
                />
              </View>
              
              {/* Location Input with Suggestions */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location</Text>
                <View style={styles.placesInputContainer}>
                  <View style={styles.locationIconContainer}>
                    <Ionicons name="search" size={adjust(16)} color="#666" />
                  </View>
                  <TextInput
                    ref={locationInputRef}
                    style={styles.locationInput}
                    placeholder="Enter your city or area"
                    placeholderTextColor="#999"
                    value={location}
                    onChangeText={handleLocationTextChange}
                    onFocus={() => {
                      setShowCitySuggestions(location.length > 0);
                      handleLocationFocus();
                    }}
                    onBlur={() => {
                      // Delay hiding suggestions to allow for selection
                      setTimeout(() => setShowCitySuggestions(false), 150);
                    }}
                  />
                </View>
                
                {/* City suggestions dropdown */}
                {showCitySuggestions && location.length > 0 && (
                  <View style={styles.suggestionsWrapper}>
                    <View style={styles.suggestionsCard}>
                      {isPlacesLoading ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="small" color="#4361EE" />
                          <Text style={styles.loadingText}>Finding cities...</Text>
                        </View>
                      ) : placesResults.length > 0 ? (
                        <ScrollView 
                          style={styles.suggestionsList}
                          showsVerticalScrollIndicator={true}
                          keyboardShouldPersistTaps="handled"
                          nestedScrollEnabled={true}
                        >
                          {placesResults.map((item) => (
                            <TouchableOpacity 
                              key={item.place_id}
                              style={styles.suggestionItem}
                              onPress={() => handlePlaceSelected(item.place_id, item.description)}
                            >
                              <Ionicons name="location-outline" size={adjust(16)} color="#666" />
                              <View style={styles.suggestionTextContainer}>
                                <Text style={styles.suggestionMainText}>
                                  {item.structured_formatting?.main_text || item.description.split(',')[0]}
                                </Text>
                                {(item.structured_formatting?.secondary_text || item.description.includes(',')) && (
                                  <Text style={styles.suggestionSecondaryText}>
                                    {item.structured_formatting?.secondary_text || 
                                     item.description.split(',').slice(1).join(',').trim()}
                                  </Text>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      ) : (
                        <View style={styles.emptyResultContainer}>
                          <Text style={styles.emptyResultText}>No cities found</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </View>
              
              {/* Add extra padding at the bottom when keyboard is visible */}
              {keyboardVisible && <View style={styles.keyboardSpacer} />}
            </ScrollView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButtonSmall}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButtonSmall}
                onPress={savePersonalInfo}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        );
      case 'dailyRoutine':
        return (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Daily Routine</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={adjust(22)} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScrollView}>
              {/* Morning Activities */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Morning Activities</Text>
                <Text style={styles.sectionDescription}>Select one activity</Text>
                
                <View style={styles.activitiesGrid}>
                  {morningActivities.map(activity => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityBox,
                        selectedMorningActivity === activity.id && styles.selectedActivityBox
                      ]}
                      onPress={() => toggleMorningActivity(activity.id)}
                    >
                      <MaterialCommunityIcons
                        name={activity.icon}
                        size={adjust(22)}
                        color={selectedMorningActivity === activity.id ? '#fff' : '#333'}
                      />
                      <Text
                        style={[
                          styles.activityLabel,
                          selectedMorningActivity === activity.id && styles.selectedActivityLabel
                        ]}
                      >
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Commute Method */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Commute Method</Text>
                <Text style={styles.sectionDescription}>How do you usually get to work or school?</Text>
                
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.commuteContainer}
                >
                  {commuteOptions.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.commuteOption,
                        selectedCommuteMethod === option.id && styles.selectedCommuteOption
                      ]}
                      onPress={() => setSelectedCommuteMethod(option.id)}
                    >
                      <Ionicons
                        name={option.icon}
                        size={adjust(18)}
                        color={selectedCommuteMethod === option.id ? '#fff' : '#333'}
                      />
                      <Text
                        style={[
                          styles.commuteLabel,
                          selectedCommuteMethod === option.id && styles.selectedCommuteLabel
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              {/* Commute Time */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Commute Time</Text>
                <Text style={styles.sectionDescription}>When do you typically commute?</Text>
                
                <View style={styles.timePickerContainer}>
                  {/* Hours */}
                  <View style={styles.timeSection}>
                    <TouchableOpacity onPress={() => setCommuteHours(prev => (prev < 12 ? prev + 1 : 1))} style={styles.timeButton}>
                      <Ionicons name="chevron-up" size={adjust(16)} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeText}>{commuteHours}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCommuteHours(prev => (prev > 1 ? prev - 1 : 12))} style={styles.timeButton}>
                      <Ionicons name="chevron-down" size={adjust(16)} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={styles.timeSeparator}>:</Text>
                  
                  {/* Minutes */}
                  <View style={styles.timeSection}>
                    <TouchableOpacity onPress={() => setCommuteMinutes(prev => (prev < 55 ? prev + 5 : 0))} style={styles.timeButton}>
                      <Ionicons name="chevron-up" size={adjust(16)} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.timeDisplay}>
                      <Text style={styles.timeText}>{commuteMinutes.toString().padStart(2, '0')}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setCommuteMinutes(prev => (prev > 0 ? prev - 5 : 55))} style={styles.timeButton}>
                      <Ionicons name="chevron-down" size={adjust(16)} color="#333" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* AM/PM Toggle */}
                  <View style={styles.ampmContainer}>
                    <TouchableOpacity
                      style={[styles.ampmButton, isAM && styles.ampmActive]}
                      onPress={() => setIsAM(true)}
                    >
                      <Text style={[styles.ampmText, isAM && styles.ampmActiveText]}>AM</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ampmButton, !isAM && styles.ampmActive]}
                      onPress={() => setIsAM(false)}
                    >
                      <Text style={[styles.ampmText, !isAM && styles.ampmActiveText]}>PM</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              
              {/* Evening Activities */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Evening Activities</Text>
                <Text style={styles.sectionDescription}>Select up to 2 activities</Text>
                
                <View style={styles.activitiesGrid}>
                  {eveningActivities.map(activity => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityBox,
                        selectedEveningActivities.includes(activity.id) && styles.selectedActivityBox
                      ]}
                      onPress={() => toggleEveningActivity(activity.id)}
                    >
                      <MaterialCommunityIcons
                        name={activity.icon}
                        size={adjust(22)}
                        color={selectedEveningActivities.includes(activity.id) ? '#fff' : '#333'}
                      />
                      <Text
                        style={[
                          styles.activityLabel,
                          selectedEveningActivities.includes(activity.id) && styles.selectedActivityLabel
                        ]}
                      >
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButtonSmall}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButtonSmall}
                onPress={saveDailyRoutine}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'preferences':
        return (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Style & Health Preferences</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={adjust(22)} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={styles.formScrollView}>
              {/* Style Preference */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Clothing Style</Text>
                <Text style={styles.sectionDescription}>What's your typical clothing style?</Text>
                
                <View style={styles.styleOptionsContainer}>
                  {styleOptions.map(style => (
                    <TouchableOpacity
                      key={style.id}
                      style={[
                        styles.styleOption,
                        selectedStyle === style.id && styles.selectedStyleOption
                      ]}
                      onPress={() => setSelectedStyle(style.id)}
                    >
                      <View style={styles.styleIconContainer}>
                        {style.id === 'casual' && (
                          <MaterialCommunityIcons name="tshirt-crew" size={adjust(18)} color={selectedStyle === style.id ? '#fff' : '#333'} />
                        )}
                        {style.id === 'professional' && (
                          <MaterialCommunityIcons name="tie" size={adjust(18)} color={selectedStyle === style.id ? '#fff' : '#333'} />
                        )}
                        {style.id === 'sporty' && (
                          <MaterialCommunityIcons name="run" size={adjust(18)} color={selectedStyle === style.id ? '#fff' : '#333'} />
                        )}
                      </View>
                      <View style={styles.styleTextContainer}>
                        <Text style={[styles.styleLabel, selectedStyle === style.id && styles.selectedStyleLabel]}>
                          {style.label}
                        </Text>
                        <Text style={[styles.styleDescription, selectedStyle === style.id && styles.selectedStyleDescription]}>
                          {style.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Health Concerns */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Health Concerns</Text>
                <Text style={styles.sectionDescription}>Select up to 3 health concerns (optional)</Text>
                
                <View style={styles.healthConcernsGrid}>
                  {healthOptions.map(concern => {
                    // Check if this concern is selected by exact ID match
                    const isSelected = selectedHealthConcerns.indexOf(concern.id) !== -1;
                    return (
                      <TouchableOpacity
                        key={concern.id}
                        style={{
                          width: '48%',
                          backgroundColor: isSelected ? '#4361EE' : '#f9f9f9',
                          borderRadius: adjust(6),
                          padding: adjust(12),
                          marginBottom: adjust(8),
                          borderWidth: isSelected ? 2 : 1,
                          borderColor: isSelected ? '#4361EE' : '#eee',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: adjust(44),
                          shadowColor: isSelected ? '#000' : 'transparent',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.3 : 0,
                          shadowRadius: isSelected ? 3 : 0,
                          elevation: isSelected ? 3 : 0,
                        }}
                        onPress={() => {
                          console.log('Health concern pressed:', concern.id);
                          console.log('Current array:', JSON.stringify(selectedHealthConcerns));
                          
                          // Create a completely fresh array each time
                          let newSelections;
                          
                          if (selectedHealthConcerns.indexOf(concern.id) !== -1) {
                            // Remove it if selected
                            newSelections = selectedHealthConcerns
                              .filter(id => id !== concern.id && id !== '');
                          } else {
                            // Add it if not at limit
                            if (selectedHealthConcerns.filter(id => id !== '').length < 3) {
                              newSelections = [...selectedHealthConcerns.filter(id => id !== ''), concern.id];
                            } else {
                              newSelections = selectedHealthConcerns.filter(id => id !== '');
                            }
                          }
                          
                          console.log('Setting selections to:', JSON.stringify(newSelections));
                          setSelectedHealthConcerns(newSelections);
                        }}
                      >
                        <Text style={{
                          fontSize: adjust(13),
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? 'white' : '#333',
                          textAlign: 'center',
                        }}>
                          {concern.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              {/* Activity Preferences */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Weather-Sensitive Activities</Text>
                <Text style={styles.sectionDescription}>Select up to 3 activities you enjoy (optional)</Text>
                
                <View style={styles.activitiesGrid}>
                  {activityPreferences.map(activity => (
                    <TouchableOpacity
                      key={activity.id}
                      style={[
                        styles.activityPreferenceBox,
                        selectedActivities.includes(activity.id) && styles.selectedActivityPreferenceBox
                      ]}
                      onPress={() => toggleActivity(activity.id)}
                    >
                      {activity.id === 'bbq' && <MaterialCommunityIcons name="grill" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'hiking' && <MaterialCommunityIcons name="hiking" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'outdoor' && <MaterialCommunityIcons name="party-popper" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'beach' && <MaterialCommunityIcons name="beach" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'camping' && <MaterialCommunityIcons name="tent" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'sports' && <MaterialCommunityIcons name="basketball" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'gardening' && <MaterialCommunityIcons name="flower" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      {activity.id === 'cycling' && <MaterialCommunityIcons name="bicycle" size={adjust(18)} color={selectedActivities.includes(activity.id) ? '#fff' : '#333'} />}
                      <Text
                        style={[
                          styles.activityPreferenceLabel,
                          selectedActivities.includes(activity.id) && styles.selectedActivityPreferenceLabel
                        ]}
                      >
                        {activity.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButtonSmall}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButtonSmall}
                onPress={savePreferences}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'clearData':
        return (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Clear Data</Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={adjust(22)} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              This will reset all your data and preferences. You'll need to set up Skylar again.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButtonSmall}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButtonSmall, {backgroundColor: '#FF3B30'}]}
                onPress={() => {
                  // Clear all user data
                  UserDataManager.clearAllData().then(() => {
                    closeModal();
                    // Navigate back to Welcome screen
                    navigation.reset({
                      index: 0,
                      routes: [{ name: 'Welcome' }],
                    });
                  });
                }}
              >
                <Text style={styles.saveButtonText}>Reset All Data</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <LinearGradient
        colors={['#D9E6F7', '#E9EFF8']}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
      >
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header with back button */}
            <View style={styles.headerRow}>
              <TouchableOpacity 
                style={styles.backButton} 
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={adjust(22)} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Settings</Text>
              <View style={styles.transparent} />
            </View>

            {/* Account Settings */}
            <Text style={styles.sectionTitle}>Account Settings</Text>
            
            {/* Personal Information */}
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => openSettingsModal('personalInfo')}
            >
              <View style={styles.settingIconContainer}>
                <Ionicons name="person-outline" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Personal Information</Text>
                <Text style={styles.settingDescription}>Name, age, gender, occupation, location</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>
            
            {/* Daily Routine */}
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => openSettingsModal('dailyRoutine')}
            >
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="clock-time-eight-outline" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Daily Routine</Text>
                <Text style={styles.settingDescription}>Morning activities, commute, evening activities</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>
            
            {/* Preferences */}
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => openSettingsModal('preferences')}
            >
              <View style={styles.settingIconContainer}>
                <MaterialIcons name="favorite-outline" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Style & Health</Text>
                <Text style={styles.settingDescription}>Clothing style, health concerns, activities</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>

            {/* App Settings */}
            <Text style={styles.sectionTitle}>App Settings</Text>
            
            {/* Temperature Units */}
            <View style={styles.settingToggleRow}>
              <View style={styles.settingIconContainer}>
                <MaterialCommunityIcons name="temperature-celsius" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Use Celsius</Text>
                <Text style={styles.settingDescription}>Switch between °F and °C</Text>
              </View>
              <Switch
                value={useCelsius}
                onValueChange={setUseCelsius}
                trackColor={{ false: '#e0e0e0', true: '#b3c7ff' }}
                thumbColor={useCelsius ? '#4361EE' : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>
            
            {/* Dark Mode */}
            <View style={styles.settingToggleRow}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="moon-outline" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Switch between light and dark theme</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e0e0e0', true: '#b3c7ff' }}
                thumbColor={darkMode ? '#4361EE' : '#f4f3f4'}
                ios_backgroundColor="#e0e0e0"
              />
            </View>
            
            {/* About Section */}
            <Text style={styles.sectionTitle}>About</Text>
            
            {/* App Version */}
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Ionicons name="information-circle-outline" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>App Version</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
            
            {/* Privacy Policy */}
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <MaterialIcons name="privacy-tip" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>Read our privacy policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>
            
            {/* Terms of Service */}
            <TouchableOpacity style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <MaterialIcons name="description" size={adjust(20)} color="#4361EE" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Text style={styles.settingDescription}>Read our terms of service</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>
            
            {/* Danger Zone */}
            <Text style={[styles.sectionTitle, styles.dangerText]}>Danger Zone</Text>
            
            {/* Clear Data */}
            <TouchableOpacity 
              style={[styles.settingRow, styles.dangerZone]}
              onPress={() => openSettingsModal('clearData')}
            >
              <View style={[styles.settingIconContainer, styles.dangerIcon]}>
                <MaterialIcons name="delete-outline" size={adjust(20)} color="#FF3B30" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Clear All Data</Text>
                <Text style={styles.settingDescription}>Reset all your preferences and data</Text>
              </View>
              <Ionicons name="chevron-forward" size={adjust(18)} color="#999" />
            </TouchableOpacity>
            
            {/* Version */}
            <View style={styles.versionContainer}>
              <Text style={styles.versionText}>Skylar Weather App</Text>
              <Text style={styles.versionText}>Version 1.0.0</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
      
      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          {renderModalContent()}
        </View>
      </Modal>
      
      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toast, 
            toastType === 'success' ? styles.successToast : styles.errorToast,
            { opacity: fadeAnim }
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  gradientBackground: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: adjust(20),
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: adjust(15),
  },
  headerTitle: {
    fontSize: adjust(18),
    fontWeight: '600',
    color: '#333',
  },
  backButton: {
    width: adjust(40),
    height: adjust(40),
    borderRadius: adjust(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  transparent: {
    width: adjust(40),
    height: adjust(40),
  },
  sectionTitle: {
    fontSize: adjust(15),
    fontWeight: '600',
    color: '#333',
    marginTop: adjust(16),
    marginBottom: adjust(8),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: adjust(12),
    padding: adjust(15),
    marginBottom: adjust(10),
  },
  settingToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: adjust(12),
    padding: adjust(15),
    marginBottom: adjust(10),
  },
  settingIconContainer: {
    width: adjust(40),
    height: adjust(40),
    borderRadius: adjust(20),
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(15),
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: adjust(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(2),
  },
  settingDescription: {
    fontSize: adjust(12),
    color: '#666',
  },
  dangerText: {
    color: '#FF3B30',
  },
  dangerZone: {
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerIcon: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  versionContainer: {
    marginTop: adjust(30),
    marginBottom: adjust(50),
    alignItems: 'center',
  },
  versionText: {
    fontSize: adjust(12),
    color: '#999',
    marginBottom: adjust(5),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: adjust(20),
  },
  modalContainer: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: adjust(14),
    padding: adjust(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    maxWidth: adjust(320),
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(12),
    paddingBottom: adjust(8),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
  },
  modalDescription: {
    fontSize: adjust(14),
    color: '#666',
    marginBottom: adjust(20),
    lineHeight: adjust(20),
  },
  modalButton: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(6),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(15),
    alignItems: 'center',
    flex: 0,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: adjust(14),
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: adjust(5),
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
    marginRight: adjust(8),
    flex: 0,
    paddingHorizontal: adjust(15),
  },
  cancelButtonText: {
    color: '#333',
    fontSize: adjust(13),
    fontWeight: '500',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
    flex: 1,
  },
  dangerButtonText: {
    color: '#fff',
    fontSize: adjust(14),
    fontWeight: '500',
  },
  formScrollView: {
    maxHeight: adjust(420),
    marginBottom: adjust(10),
  },
  formScrollViewExtended: {
    maxHeight: Platform.OS === 'ios' ? adjust(300) : adjust(350),
  },
  formGroup: {
    marginBottom: adjust(15),
  },
  formLabel: {
    fontSize: adjust(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(5),
  },
  formInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(8),
    padding: adjust(12),
    fontSize: adjust(14),
    borderWidth: 1,
    borderColor: '#eee',
    color: '#333',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: adjust(6),
    flexWrap: 'wrap',
  },
  optionButton: {
    flex: 0,
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(6),
    padding: adjust(6),
    alignItems: 'center',
    marginHorizontal: adjust(2),
    marginBottom: adjust(4),
    borderWidth: 1,
    borderColor: '#eee',
    minWidth: adjust(60),
    width: '30%',
  },
  selectedOptionButton: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
  },
  optionText: {
    fontSize: adjust(14),
    color: '#333',
  },
  selectedOptionText: {
    color: '#fff',
  },
  sectionContainer: {
    marginBottom: adjust(20),
  },
  sectionDescription: {
    fontSize: adjust(12),
    color: '#666',
    marginBottom: adjust(8),
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  activityBox: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(6),
    padding: adjust(8),
    marginBottom: adjust(8),
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  selectedActivityBox: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
  },
  activityLabel: {
    fontSize: adjust(12),
    fontWeight: '500',
    color: '#333',
    marginLeft: adjust(5),
  },
  selectedActivityLabel: {
    color: '#fff',
  },
  styleOptionsContainer: {
    marginBottom: adjust(10),
  },
  styleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(8),
    padding: adjust(8),
    marginBottom: adjust(6),
    borderWidth: 1,
    borderColor: '#eee',
    width: '100%',
  },
  selectedStyleOption: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ scale: 1.05 }],
  },
  styleIconContainer: {
    width: adjust(30),
    height: adjust(30),
    borderRadius: adjust(15),
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: adjust(8),
  },
  styleTextContainer: {
    flex: 1,
  },
  styleLabel: {
    fontSize: adjust(13),
    fontWeight: '500',
    color: '#333',
    marginBottom: adjust(1),
  },
  styleDescription: {
    fontSize: adjust(11),
    color: '#666',
  },
  selectedStyleLabel: {
    color: '#fff',
  },
  selectedStyleDescription: {
    color: '#fff',
  },
  healthConcernsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  concernOption: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(6),
    padding: adjust(12),
    marginBottom: adjust(8),
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: adjust(44),
  },
  selectedConcernOption: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
    transform: [{ scale: 1.05 }],
  },
  concernLabel: {
    fontSize: adjust(13),
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },
  selectedConcernLabel: {
    color: 'white',
    fontWeight: '700',
  },
  activityPreferenceBox: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(8),
    padding: adjust(10),
    marginBottom: adjust(10),
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedActivityPreferenceBox: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
  },
  activityPreferenceLabel: {
    fontSize: adjust(12),
    color: '#333',
    marginLeft: adjust(10),
  },
  selectedActivityPreferenceLabel: {
    color: '#fff',
  },
  commuteContainer: {
    paddingVertical: adjust(5),
  },
  commuteOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(16),
    paddingVertical: adjust(6),
    paddingHorizontal: adjust(10),
    marginRight: adjust(6),
    borderWidth: 1,
    borderColor: '#eee',
  },
  selectedCommuteOption: {
    backgroundColor: '#4361EE',
    borderColor: '#4361EE',
  },
  commuteLabel: {
    fontSize: adjust(12),
    color: '#333',
    marginLeft: adjust(4),
  },
  selectedCommuteLabel: {
    color: '#fff',
  },
  timePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: adjust(8),
    padding: adjust(10),
    borderWidth: 1,
    borderColor: '#eee',
  },
  timeSection: {
    alignItems: 'center',
  },
  timeButton: {
    padding: adjust(5),
  },
  timeDisplay: {
    width: adjust(36),
    height: adjust(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: adjust(18),
    fontWeight: '600',
    color: '#333',
  },
  timeSeparator: {
    fontSize: adjust(20),
    fontWeight: '600',
    color: '#333',
    marginHorizontal: adjust(10),
  },
  ampmContainer: {
    marginLeft: adjust(12),
    flexDirection: 'column',
    borderRadius: adjust(6),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  ampmButton: {
    paddingVertical: adjust(6),
    paddingHorizontal: adjust(10),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9f9f9',
  },
  ampmActive: {
    backgroundColor: '#4361EE',
  },
  ampmText: {
    fontSize: adjust(12),
    fontWeight: '500',
    color: '#333',
  },
  ampmActiveText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: adjust(10),
    paddingHorizontal: adjust(5),
  },
  cancelButtonSmall: {
    backgroundColor: '#F2F2F2',
    borderRadius: adjust(6),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(12),
    flex: 1,
    marginRight: adjust(10),
    alignItems: 'center',
  },
  saveButtonSmall: {
    backgroundColor: '#4361EE',
    borderRadius: adjust(6),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(12),
    flex: 1,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: adjust(13),
    fontWeight: '500',
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: adjust(50),
    left: '10%',
    right: '10%',
    backgroundColor: 'white',
    paddingVertical: adjust(12),
    paddingHorizontal: adjust(16),
    borderRadius: adjust(8),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#4361EE',
  },
  errorToast: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  toastText: {
    fontSize: adjust(14),
    color: '#333',
    fontWeight: '500',
  },
  placesInputContainer: {
    position: 'relative',
    zIndex: 100,
  },
  locationIconContainer: {
    position: 'absolute',
    left: adjust(10),
    top: adjust(15),
    zIndex: 10,
  },
  locationInput: {
    height: adjust(42),
    paddingHorizontal: adjust(12),
    paddingLeft: adjust(35),
    fontSize: adjust(13),
    color: '#333',
    backgroundColor: '#f8f9fa',
    borderRadius: adjust(8),
    borderColor: '#e0e0e0',
    borderWidth: 1,
    zIndex: 1,
  },
  suggestionsWrapper: {
    position: 'relative',
    marginTop: 5,
    marginBottom: 5,
    zIndex: 9999,
  },
  suggestionsCard: {
    backgroundColor: '#fff',
    borderRadius: adjust(8),
    minHeight: adjust(50),
    maxHeight: adjust(150), // Reduced height to ensure visibility
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  suggestionsList: {
    maxHeight: adjust(200),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: adjust(12),
    paddingHorizontal: adjust(16),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: adjust(8),
  },
  suggestionMainText: {
    fontSize: adjust(14),
    color: '#333',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: adjust(12),
    color: '#666',
    marginTop: adjust(2),
  },
  loadingContainer: {
    padding: adjust(15),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: adjust(10),
    fontSize: adjust(14),
    color: '#4361EE',
  },
  emptyResultContainer: {
    padding: adjust(15),
    alignItems: 'center',
  },
  emptyResultText: {
    fontSize: adjust(14),
    color: '#666',
  },
  keyboardSpacer: {
    height: adjust(100),
  },
});

export default SettingsScreen; 