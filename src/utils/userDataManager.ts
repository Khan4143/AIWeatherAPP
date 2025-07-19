import { UserData } from '../Screens/UserInfo';
import { DailyRoutineData } from '../Screens/DailyRoutine';
import { PreferenceData } from '../Screens/PreferenceScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  USER_PROFILE: 'skylar_user_profile',
  DAILY_ROUTINE: 'skylar_daily_routine',
  PREFERENCES: 'skylar_preferences',
  HAS_COMPLETED_ONBOARDING: 'skylar_has_completed_onboarding',
};

// ONBOARDING CONFIG: Set this to true to enable "show once" behavior
const ENABLE_ONBOARDING_ONCE = false;

// Check if AsyncStorage is available
const isAsyncStorageAvailable = () => {
  return AsyncStorage != null && typeof AsyncStorage.setItem === 'function';
};

/**
 * Central manager for accessing all user data across the app
 */
export const UserDataManager = {
  // Add loading state
  isLoading: false,

  /**
   * Get all user profile information from memory
   */
  getUserProfile() {
    return UserData.getAll();
  },
  
  /**
   * Get all daily routine information from memory
   */
  getDailyRoutine() {
    return DailyRoutineData.getAll();
  },
  
  /**
   * Get all user preferences from memory
   */
  getPreferences() {
    return PreferenceData.getAll();
  },
  
  /**
   * Get complete user data from memory
   */
  getAllUserData() {
    return {
      profile: this.getUserProfile(),
      dailyRoutine: this.getDailyRoutine(),
      preferences: this.getPreferences()
    };
  },
  
  /**
   * Save onboarding completion state
   */
  async setOnboardingComplete(complete: boolean) {
    if (!isAsyncStorageAvailable()) return false;
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, JSON.stringify(complete));
      return true;
    } catch (error) {
      console.error('Error saving onboarding state:', error);
      return false;
    }
  },

  /**
   * Check if onboarding is complete
   */
  async hasCompletedOnboarding() {
    if (!isAsyncStorageAvailable()) return false;
    
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
      return value === 'true';
    } catch (error) {
      console.error('Error checking onboarding state:', error);
      return false;
    }
  },

  /**
   * Save all current data to AsyncStorage
   */
  async saveAllData() {
    if (!isAsyncStorageAvailable()) {
      console.warn('AsyncStorage is not available, data will only be stored in memory');
      return false;
    }
    
    try {
      const userData = this.getAllUserData();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userData.profile));
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_ROUTINE, JSON.stringify(userData.dailyRoutine));
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(userData.preferences));
      
      // Only set onboarding as complete if the feature is enabled
      if (ENABLE_ONBOARDING_ONCE) {
        if (
          userData.profile &&
          userData.profile.location &&
          userData.dailyRoutine &&
          userData.preferences
        ) {
          await this.setOnboardingComplete(true);
        }
      }
      
      console.log('All user data saved to AsyncStorage');
      return true;
    } catch (error) {
      console.error('Error saving data to AsyncStorage:', error);
      return false;
    }
  },
  
  /**
   * Save user profile data to AsyncStorage
   */
  async saveUserProfile() {
    if (!isAsyncStorageAvailable()) {
      console.warn('AsyncStorage is not available, data will only be stored in memory');
      return false;
    }
    
    try {
      const profile = this.getUserProfile();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      console.log('User profile saved to AsyncStorage');
      return true;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  },
  
  /**
   * Save daily routine data to AsyncStorage
   */
  async saveDailyRoutine() {
    if (!isAsyncStorageAvailable()) {
      console.warn('AsyncStorage is not available, data will only be stored in memory');
      return false;
    }
    
    try {
      const routine = this.getDailyRoutine();
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_ROUTINE, JSON.stringify(routine));
      console.log('Daily routine saved to AsyncStorage');
      return true;
    } catch (error) {
      console.error('Error saving daily routine:', error);
      return false;
    }
  },
  
  /**
   * Save preferences data to AsyncStorage
   */
  async savePreferences() {
    if (!isAsyncStorageAvailable()) {
      console.warn('AsyncStorage is not available, data will only be stored in memory');
      return false;
    }
    
    try {
      const preferences = this.getPreferences();
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      console.log('Preferences saved to AsyncStorage');
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  },
  
  /**
   * Load all data from AsyncStorage
   */
  async loadAllData() {
    if (!isAsyncStorageAvailable()) {
      console.warn('AsyncStorage is not available, using in-memory data only');
      return false;
    }
    
    try {
      this.isLoading = true;
      
      // Load user profile
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        UserData.setAll(profile);
      }
      
      // Load daily routine
      const routineJson = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_ROUTINE);
      if (routineJson) {
        const routine = JSON.parse(routineJson);
        DailyRoutineData.setAll(routine);
      }
      
      // Load preferences
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (preferencesJson) {
        const preferences = JSON.parse(preferencesJson);
        PreferenceData.setAll(preferences);
      }
      
      console.log('All user data loaded from AsyncStorage');
      return true;
    } catch (error) {
      console.error('Error loading data from AsyncStorage:', error);
      return false;
    } finally {
      this.isLoading = false;
    }
  },
  
  /**
   * Clear all user data from memory and AsyncStorage
   */
  async clearAllData() {
    // Clear memory
    UserData.setAll({
      age: '',
      gender: '',
      occupation: '',
      location: '',
    });
    
    DailyRoutineData.setAll({
      morningActivity: null,
      commuteMethod: null,
      commuteTime: {
        hours: 8,
        minutes: 0,
        isAM: true,
      },
      eveningActivity: null,
      selectedActivity: null,
    });
    
    PreferenceData.setAll({
      style: null,
      healthConcerns: [],
      activities: [],
    });
    
    // Clear storage if available
    if (isAsyncStorageAvailable()) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_ROUTINE);
        await AsyncStorage.removeItem(STORAGE_KEYS.PREFERENCES);
        console.log('All user data cleared from AsyncStorage');
      } catch (error) {
        console.error('Error clearing data from AsyncStorage:', error);
      }
    }
    
    return true;
  }
}; 