import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import adjust from '../utils/adjust';
import { SCREEN_WIDTH } from '../constants/dimesions';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigations/Navigations';
import { UserDataManager } from '../utils/userDataManager';
import { useFocusEffect } from '@react-navigation/native';
import { UserData } from '../Screens/UserInfo';
import { DailyRoutineData } from '../Screens/DailyRoutine';
import { PreferenceData } from '../Screens/PreferenceScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeAdComponent from '../components/NativeAdComponent';
import { useAdMob } from '../contexts/AdContext';

// Storage keys (should match UserDataManager's keys)
const STORAGE_KEYS = {
  USER_PROFILE: 'skylar_user_profile',
  DAILY_ROUTINE: 'skylar_daily_routine',
  PREFERENCES: 'skylar_preferences',
};

// Add interfaces that match the actual data structures
interface UserDataType {
  age: string;
  gender: string;
  occupation: string;
  location: string;
  name?: string; // Added for compatibility
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
  notifications?: {
    commute?: boolean;
    clothing?: boolean;
    health?: boolean;
    events?: boolean;
  };
  units?: {
    temperature?: string;
  };
  language?: string;
}

type ProfileScreenProps = {
  navigation: StackNavigationProp<RootStackParamList>;
};

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  // State for toggle switches
  const [commuteAlerts, setCommuteAlerts] = useState(false);
  const [clothingSuggestions, setClothingSuggestions] = useState(false);
  const [healthTips, setHealthTips] = useState(false);
  const [eventReminders, setEventReminders] = useState(false);
  
  // User data state
  const [userName, setUserName] = useState('');
  const [userAge, setUserAge] = useState('');
  const [userGender, setUserGender] = useState('');
  const [userOccupation, setUserOccupation] = useState('');
  const [userLocation, setUserLocation] = useState('');
  // Update the temperatureUnit state to use correct type
  const [temperatureUnit, setTemperatureUnit] = useState<'metric' | 'imperial'>('imperial');
  const [languagePreference, setLanguagePreference] = useState('English');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  // Add states for preference data
  const [stylePreference, setStylePreference] = useState<string | null>(null);
  const [healthConcerns, setHealthConcerns] = useState<string[]>([]);
  const [preferredActivities, setPreferredActivities] = useState<string[]>([]);
  const { initialized } = useAdMob();

  // Morning activities
  const allMorningActivities = [
    { id: '1', name: 'Running', icon: 'run', selected: false },
    { id: '2', name: 'Yoga', icon: 'yoga', selected: false },
    { id: '5', name: 'Gym', icon: 'weight-lifter', selected: false },
    { id: '6', name: 'Dog Walk', icon: 'dog', selected: false },
  ];

  const [morningActivities, setMorningActivities] = useState(allMorningActivities);
  const [userCommuteMethod, setUserCommuteMethod] = useState('');
  const [userCommuteTime, setUserCommuteTime] = useState({ hours: 8, minutes: 0, isAM: true });
  const [userEveningActivity, setUserEveningActivity] = useState('');

  // Function to refresh data - extract this from useFocusEffect for reuse
  const refreshData = async () => {
    try {
      console.log("===== PROFILE SCREEN: Starting data refresh from AsyncStorage =====");
      
      // First, directly check what's in AsyncStorage for debugging
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        console.log("PROFILE SCREEN - Raw profile data in AsyncStorage:", profileJson);
      } else {
        console.warn("PROFILE SCREEN - No profile data found in AsyncStorage!");
      }
      
      // Force a complete reload from AsyncStorage
      await UserDataManager.loadAllData();
      
      // Get the freshly loaded data
      const userData = UserDataManager.getAllUserData();
      console.log("PROFILE SCREEN - Loaded user data:", JSON.stringify(userData, null, 2));
      
      // Update all state variables with fresh data
      if (userData.profile) {
        const profile = userData.profile as UserDataType;
        console.log("PROFILE SCREEN - Setting profile data:", JSON.stringify(profile, null, 2));
        setUserOccupation(profile.occupation || '');
        setUserName(profile.name || profile.occupation || '');
        setUserLocation(profile.location || '');
        setUserAge(profile.age || '');
        setUserGender(profile.gender || '');
      } else {
        console.log("PROFILE SCREEN - No profile data found!");
      }
      
      if (userData.preferences) {
        const preferences = userData.preferences as PreferenceDataType;
        console.log("PROFILE SCREEN - Setting preferences data");
        setCommuteAlerts(preferences.notifications?.commute || false);
        setClothingSuggestions(preferences.notifications?.clothing || false);
        setHealthTips(preferences.notifications?.health || false);
        setEventReminders(preferences.notifications?.events || false);
        
        if (preferences.units?.temperature) {
          setTemperatureUnit(preferences.units.temperature as 'metric' | 'imperial');
        }
        
        if (preferences.language) {
          setLanguagePreference(preferences.language);
        }
        
        if (preferences.style) {
          setStylePreference(preferences.style);
        }
        
        if (preferences.healthConcerns && Array.isArray(preferences.healthConcerns)) {
          setHealthConcerns([...preferences.healthConcerns]);
        }
        
        if (preferences.activities && Array.isArray(preferences.activities)) {
          setPreferredActivities([...preferences.activities]);
        }
      }
      
      if (userData.dailyRoutine) {
        const dailyRoutine = userData.dailyRoutine as DailyRoutineType;
        console.log("PROFILE SCREEN - Setting daily routine data");
        
        if (dailyRoutine.commuteMethod) {
          setUserCommuteMethod(dailyRoutine.commuteMethod);
        }
        
        if (dailyRoutine.commuteTime) {
          setUserCommuteTime(dailyRoutine.commuteTime);
        }
        
        if (dailyRoutine.eveningActivity) {
          setUserEveningActivity(dailyRoutine.eveningActivity);
        }
        
        if (dailyRoutine.activities && dailyRoutine.activities.length > 0) {
          // Ensure only one morning activity can be selected
          // Find the first morning activity in the list (if any)
          const morningActivityName = dailyRoutine.activities.find(activityName => 
            allMorningActivities.some(ma => ma.name === activityName)
          );
          
          // Map all activities to have selected=false by default
          const updatedActivities = allMorningActivities.map(activity => ({
            ...activity,
            // Only mark the found morning activity as selected
            selected: activity.name === morningActivityName
          }));
          
          setMorningActivities(updatedActivities);
          setSelectedActivities(dailyRoutine.activities);
        }
      }
      
      console.log("===== PROFILE SCREEN: Data refresh completed =====");
    } catch (error) {
      console.error("PROFILE SCREEN - Error refreshing data:", error);
    }
  };

  // Function to save changes
  const saveChanges = async () => {
    try {
      console.log("===== PROFILE SCREEN: Saving changes =====");
      
      // First, get current data
      const userData = UserDataManager.getAllUserData();
      
      // 1. Update profile data
      const updatedProfile = {
        ...userData.profile,
        age: userAge,
        gender: userGender,
        occupation: userOccupation,
        location: userLocation,
        name: userName
      };
      
      console.log("PROFILE SCREEN - Saving profile:", JSON.stringify(updatedProfile, null, 2));
      
      // 2. Update preferences data
      const updatedPreferences = {
        ...userData.preferences,
        style: stylePreference,
        healthConcerns: [...healthConcerns],
        activities: [...preferredActivities],
        notifications: {
          commute: commuteAlerts,
          clothing: clothingSuggestions,
          health: healthTips,
          events: eventReminders
        },
        units: {
          temperature: temperatureUnit // Now correctly typed as 'metric' | 'imperial'
        },
        language: languagePreference
      };
      
      // 3. Update daily routine data
      const selectedActivitiesList = morningActivities
        .filter(activity => activity.selected)
        .map(activity => activity.name);
      
      const updatedRoutine = {
        ...userData.dailyRoutine,
        commuteMethod: userCommuteMethod,
        commuteTime: {...userCommuteTime},
        eveningActivity: userEveningActivity,
        activities: selectedActivitiesList
      };
      
      // First directly update the data objects
      UserData.setAll(updatedProfile);
      PreferenceData.setAll(updatedPreferences);
      DailyRoutineData.setAll(updatedRoutine);
      
      // Then save to AsyncStorage
      await UserDataManager.saveAllData();
      
      console.log("PROFILE SCREEN - All changes saved successfully");
      
      // Verify data was saved to AsyncStorage
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        console.log("PROFILE SCREEN - Profile saved to AsyncStorage:", profileJson);
      } else {
        console.warn("PROFILE SCREEN - No profile data found in AsyncStorage after save!");
      }
      
      // Reload data to ensure UI is in sync
      await refreshData();
      
      // Show success message
      Alert.alert(
        "Success", 
        "Your profile has been updated successfully!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("PROFILE SCREEN - Error saving changes:", error);
      
      // Show error message
      Alert.alert(
        "Error", 
        "There was a problem saving your changes. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Load user data when the component mounts
  useEffect(() => {
    console.log("PROFILE SCREEN - Initial mount, loading data");
    refreshData();
  }, []);

  // Reload data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log("===== PROFILE SCREEN: Screen focused - reloading user data =====");
      
      // Force a reload when screen comes into focus
      refreshData();
      
      return () => {
        console.log("PROFILE SCREEN - Screen lost focus");
      };
    }, []) // Empty dependency array means this runs on every focus
  );

  // Function to navigate to onboarding screens
  const navigateToOnboarding = () => {
    navigation.navigate('Welcome', { bypassOnboardingCheck: true });
  };

  // Function to get the style name for display
  const getStyleDisplayName = (styleId: string | null): string => {
    if (!styleId) return 'Not set';
    
    const styleMap: {[key: string]: string} = {
      'casual': 'Casual',
      'professional': 'Professional',
      'sporty': 'Sporty'
    };
    
    return styleMap[styleId] || 'Not set';
  };
  
  // Function to get appropriate icon for activity
  const getActivityIcon = (activity: string): string => {
    const activityIcons: {[key: string]: string} = {
      'BBQ': 'grill',
      'Hiking': 'hiking',
      'Outdoor Party': 'party-popper',
      'Beach': 'beach',
      'Camping': 'tent',
      'Sports': 'basketball',
      'Gardening': 'flower',
      'Cycling': 'bicycle',
      'Running': 'run',
      'Gym': 'dumbbell',
      'Yoga': 'yoga',
      'Dog Walk': 'dog',
      'Social Events': 'account-group',
      'Netflix/Movie': 'movie-open',
      'Reading': 'book-open-variant'
    };
    
    return activityIcons[activity] || 'run';
  };

  return (
    <>
      <LinearGradient
        colors={['#D1DEF0', '#E1EAF5']}
        style={styles.gradientBackground}
        start={{x: 0, y: 0}}
        end={{x: 0, y: 1}}
      >
        <SafeAreaView style={{ flex: 1, paddingBottom: adjust(30) }}>
          <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={initialized ? [4] : []}
          >
            {/* Header with settings */}
            <View style={styles.headerRow}>
              <View style={styles.profileImageContainer}>
                <Text style={styles.avatarInitial}>
                  {userGender ? userGender.charAt(0).toUpperCase() : "U"}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => navigation.navigate('Settings')}
              >
                <MaterialIcons name="edit" size={adjust(22)} color="#4361EE" />
              </TouchableOpacity>
            </View>
            
            {/* User name and subtitle */}
            <View style={styles.nameContainer}>
              <Text style={styles.greeting}>
                Hi {userName || userOccupation || 'User'} 👋
              </Text>
              <Text style={styles.subtitle}>
                Skylar knows your day inside out
              </Text>
            </View>

            {/* User Information Section */}
            <Text style={styles.sectionTitle}>Your Information</Text>
            <View style={styles.userInfoContainer}>
              {/* Age */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Age</Text>
                <Text style={styles.infoValue}>{userAge || 'Not set'}</Text>
              </View>

              {/* Gender */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>{userGender ? userGender.charAt(0).toUpperCase() + userGender.slice(1) : 'Not set'}</Text>
              </View>

              {/* Occupation */}
              <View style={styles.infoCard}>
                 <Text style={styles.infoLabel}>Occupation</Text>
                <Text style={styles.infoValue}>{userOccupation || 'Not set'}</Text>
              </View>

              {/* Location */}
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{userLocation || 'Not set'}</Text>
              </View>
            </View>

            {/* Native Ad between user info and activities */}
            {initialized && (
              <View style={styles.adContainer}>
                <NativeAdComponent />
              </View>
            )}

            
            {/* Morning Activities */}
            <Text style={styles.subSectionTitle}>Morning Activities</Text>
            <View style={styles.scrollContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.activitiesContainer}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                {morningActivities.filter(activity => activity.selected).length > 0 ? (
                  morningActivities
                    .filter(activity => activity.selected)
                    .map((activity) => (
                      <View 
                        key={activity.id} 
                        style={[
                          styles.activityBubble,
                          styles.selectedActivity
                        ]}
                      >
                        <MaterialCommunityIcons 
                          name={activity.icon} 
                          size={adjust(16)} 
                          color="#fff" 
                        />
                        <Text style={[
                          styles.activityText,
                          styles.selectedActivityText
                        ]}>
                          {activity.name}
                        </Text>
                      </View>
                    ))
                ) : (
                  <View style={styles.noActivityContainer}>
                    <Text style={styles.noActivityText}>No activities selected</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Commute Preferences */}
            <View style={styles.cleanCardContainer}>
              <View style={styles.commuteSection}>
                <View style={styles.commuteHeader}>
                  <MaterialIcons name="commute" size={adjust(18)} color="#4361EE" />
                  <Text style={styles.commuteTitle}>Commute Preferences</Text>
                </View>

                {/* Transport Type */}
                <View style={styles.preferencesRow}>
                  <Text style={styles.preferenceLabel}>Transport Type</Text>
                  <View style={styles.preferenceValue}>
                    <Text style={styles.preferenceValueText}>
                      {userCommuteMethod ? userCommuteMethod.charAt(0).toUpperCase() + userCommuteMethod.slice(1) : 'Not set'}
                    </Text>
                    {/* <Ionicons name="chevron-forward" size={adjust(16)} color="#4361EE" /> */}
                  </View>
                </View>

                {/* Departure Time */}
                <View style={[styles.preferencesRow, {borderBottomWidth: 0, paddingBottom: 0}]}>
                  <Text style={styles.preferenceLabel}>Departure Time</Text>
                  <View style={styles.preferenceValue}>
                    <Text style={styles.preferenceValueText}>
                      {userCommuteTime ? 
                        `${userCommuteTime.hours}:${userCommuteTime.minutes.toString().padStart(2, '0')} ${userCommuteTime.isAM ? 'AM' : 'PM'}` 
                        : '8:30 AM'}
                    </Text>
                    {/* <Ionicons name="chevron-forward" size={adjust(16)} color="#4361EE" /> */}
                  </View>
                </View>
              </View>
            </View>



            {/* Other Preferences */}
            <Text style={styles.sectionTitle}>Other Preferences</Text>
            
            {/* Preference cards grid */}
            <View style={styles.preferencesGrid}>
              {/* Location */}
              <View style={styles.preferenceCard}>
                <View style={styles.preferenceIconContainer}>
                  <Ionicons name="location-outline" size={adjust(15)} color="#4361EE" />
                </View>
                <Text style={styles.preferenceCardTitle}>Location</Text>
                <Text style={styles.preferenceCardValue}>{userLocation || 'New York'}</Text>
              </View>

              {/* Outfit Style */}
              <View style={styles.preferenceCard}>
                <View style={styles.preferenceIconContainer}>
                  <MaterialIcons name="checkroom" size={adjust(15)} color="#4361EE" />
                </View>
                <Text style={styles.preferenceCardTitle}>Outfit Style</Text>
                <Text style={styles.preferenceCardValue}>{getStyleDisplayName(stylePreference)}</Text>
              </View>

              {/* Health Tags */}
              <View style={styles.preferenceCard}>
                <View style={styles.preferenceIconContainer}>
                  <MaterialIcons name="favorite-outline" size={adjust(15)} color="#4361EE" />
                </View>
                <Text style={styles.preferenceCardTitle}>Health Tags</Text>
                <Text style={styles.preferenceCardValue}>
                  {healthConcerns.length > 0 ? `${healthConcerns.length} Active` : 'None'}
                </Text>
              </View>

              {/* App Settings */}
              <View style={styles.preferenceCard}>
                <View style={styles.preferenceIconContainer}>
                  <Ionicons name="settings-outline" size={adjust(15)} color="#4361EE" />
                </View>
                <Text style={styles.preferenceCardTitle}>App Settings</Text>
                <Text style={styles.preferenceCardValue}>{temperatureUnit}, {languagePreference}</Text>
              </View>
            </View>

            {/* Your Style & Health */}
            <Text style={styles.sectionTitle}>Your Style & Health</Text>
            
            <View style={styles.cleanCardContainer}>
              {/* Style Preference */}
              <View style={styles.preferencesRow}>
                <Text style={styles.preferenceLabel}>Clothing Style</Text>
                <View style={styles.preferenceValue}>
                  <Text style={styles.preferenceValueText}>
                    {getStyleDisplayName(stylePreference)}
                  </Text>
                </View>
              </View>
              
              {/* Health Concerns */}
              <Text style={styles.subSectionTitle}>Health Concerns</Text>
              <View style={styles.scrollContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activitiesContainer}
                  snapToAlignment="start"
                  decelerationRate="fast"
                >
                  {healthConcerns && healthConcerns.length > 0 ? (
                    healthConcerns.map((concern, index) => (
                      <View 
                        key={index} 
                        style={[styles.activityBubble, styles.selectedActivity]}
                      >
                        <MaterialCommunityIcons 
                          name="medical-bag" 
                          size={adjust(16)} 
                          color="#fff" 
                        />
                        <Text style={[styles.activityText, styles.selectedActivityText]}>
                          {concern}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItemsText}>No health concerns set</Text>
                  )}
                </ScrollView>
              </View>
              
              {/* Preferred Activities */}
              <Text style={styles.subSectionTitle}>Preferred Activities</Text>
              <View style={styles.scrollContainer}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.activitiesContainer}
                  snapToAlignment="start"
                  decelerationRate="fast"
                >
                  {preferredActivities && preferredActivities.length > 0 ? (
                    preferredActivities.map((activity, index) => (
                      <View 
                        key={index} 
                        style={[styles.activityBubble, styles.selectedActivity]}
                      >
                        <MaterialCommunityIcons 
                          name={getActivityIcon(activity)}
                          size={adjust(16)} 
                          color="#fff" 
                        />
                        <Text style={[styles.activityText, styles.selectedActivityText]}>
                          {activity}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noItemsText}>No preferred activities set</Text>
                  )}
                </ScrollView>
              </View>
            </View>

            {/* Reset Preferences */}
            <TouchableOpacity style={styles.resetContainer}>
              <Text style={styles.resetText}>Reset Preferences</Text>
            </TouchableOpacity>

            {/* Developer button for onboarding access */}
            <TouchableOpacity 
              style={styles.devButton} 
              onPress={navigateToOnboarding}
            >
              <Text style={styles.devButtonText}>Go to Onboarding</Text>
            </TouchableOpacity>

            {/* Home indicator */}
            <View style={styles.homeIndicator}>
              <View style={styles.homeIndicatorBar} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
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
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: adjust(8),
    backgroundColor: '#fff',
    zIndex: 5,
    elevation: 3,
  },
  fixedAdContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: adjust(20),
    paddingVertical: adjust(8),
    backgroundColor: '#fff',
    zIndex: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  profileImageContainer: {
    width: adjust(60),
    height: adjust(60),
    borderRadius: adjust(30),
    backgroundColor: '#4361EE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarInitial: {
    fontSize: adjust(20),
    fontWeight: 'bold',
    color: '#fff',
  },
  nameContainer: {
    alignItems: 'flex-start',
    paddingLeft: adjust(5),
  },
  greeting: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: adjust(12),
    color: '#666',
  },
  editButton: {
    width: adjust(36),
    height: adjust(36),
    borderRadius: adjust(18),
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    marginTop: adjust(14),
    marginBottom: adjust(6),
  },
  subSectionTitle: {
    fontSize: adjust(13),
    color: '#666',
    marginBottom: adjust(6),
  },
  scrollContainer: {
    marginHorizontal: -adjust(16),
    marginBottom: adjust(18),
  },
  activitiesContainer: {
    paddingVertical: adjust(4),
    paddingHorizontal: adjust(16),
    flexDirection: 'row',
  },
  activityBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: adjust(16),
    paddingHorizontal: adjust(10),
    paddingVertical: adjust(5),
    marginRight: adjust(8),
  },
  selectedActivity: {
    backgroundColor: '#4361EE',
  },
  activityText: {
    fontSize: adjust(11),
    fontWeight: '500',
    color: '#666',
    marginLeft: adjust(4),
  },
  selectedActivityText: {
    color: '#fff',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: adjust(10),
    padding: adjust(6),
    marginBottom: adjust(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 0,
  },
  cleanCardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: adjust(10),
    padding: adjust(7),
    marginBottom: adjust(12),
    shadowColor: Platform.OS === 'ios' ? '#00000010' : '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: Platform.OS === 'android' ? 0.1 : 0,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  commuteSection: {
  },
  commuteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: adjust(8),
  },
  commuteTitle: {
    fontSize: adjust(13),
    fontWeight: '500',
    color: '#333',
    marginLeft: adjust(6),
  },
  preferencesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: adjust(7),
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceLabel: {
    fontSize: adjust(12),
    color: '#333',
  },
  preferenceValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceValueText: {
    fontSize: adjust(12),
    color: '#808080',
    marginRight: adjust(4),
  },
  // notificationBox: {
  //   backgroundColor: 'rgba(67, 97, 238, 0.08)',
  //   borderRadius: adjust(10),
  //   padding: adjust(12),
  //   marginBottom: adjust(12),
  // },
  // notificationOptions: {
  //   marginVertical: adjust(6),
  // },
  // notificationRow: {
  //   flexDirection: 'row',
  //   justifyContent: 'space-between',
  //   alignItems: 'center',
  //   paddingVertical: adjust(8),
  //   borderBottomWidth: 1,
  //   borderBottomColor: '#f0f0f0',
  // },
  // notificationLabel: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
  // notificationText: {
  //   fontSize: adjust(13),
  //   color: '#333',
  //   marginLeft: adjust(6),
  // },
  // notificationCaption: {
  //   fontSize: adjust(12),
  //   color: '#666',
  //   marginTop: adjust(6),
  //   marginBottom: adjust(12),
  // },
  // customizeButton: {
  //   backgroundColor: '#4361EE',
  //   borderRadius: adjust(10),
  //   paddingVertical: adjust(12),
  //   alignItems: 'center',
  //   marginBottom: adjust(16),
  // },
  // customizeButtonText: {
  //   color: '#fff',
  //   fontSize: adjust(13),
  //   fontWeight: '600',
  // },
  resetContainer: {
    alignItems: 'center',
    marginBottom: adjust(24),
  },
  resetText: {
    color: '#FF3B30',
    fontSize: adjust(14),
    fontWeight: '500',
  },
  homeIndicator: {
    alignItems: 'center',
    paddingBottom: adjust(8),
  },
  homeIndicatorBar: {
    width: adjust(35),
    height: adjust(5),
    backgroundColor: '#D1D1D6',
    borderRadius: adjust(2.5),
  },
  devButton: {
    marginBottom: adjust(20),
    backgroundColor: '#333',
    borderRadius: adjust(8),
    padding: adjust(12),
    alignSelf: 'center',
    paddingHorizontal: adjust(20),
  },
  devButtonText: {
    color: '#fff',
    fontSize: adjust(14),
    fontWeight: '500',
  },
  userInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: adjust(12),
    marginRight: adjust(5),
  },
  infoCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: adjust(10),
    padding: adjust(7),
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 0,
  },
  infoLabel: {
    fontSize: adjust(12),
    color: '#666',
    marginBottom: adjust(2),
  },
  infoValue: {
    fontSize: adjust(11),
    fontWeight: '500',
    color: '#333',
  },
  noItemsText: {
    fontSize: adjust(12),
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(4),
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: adjust(12),
    marginRight: adjust(5),
  },
  preferenceCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: adjust(10),
    padding: adjust(7),
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    overflow: 'hidden',
    borderWidth: 0,
  },
  preferenceIconContainer: {
    width: adjust(24),
    height: adjust(24),
    borderRadius: adjust(12),
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: adjust(2),
  },
  preferenceCardTitle: {
    fontSize: adjust(12),
    color: '#666',
    marginBottom: adjust(2),
  },
  preferenceCardValue: {
    fontSize: adjust(11),
    fontWeight: '500',
    color: '#333',
  },
  noActivityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: adjust(20),
  },
  noActivityText: {
    color: '#666',
    fontSize: adjust(12),
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
    }),
  },
});

export default ProfileScreen; 