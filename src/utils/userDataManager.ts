import { UserData } from '../Screens/UserInfo';
import { DailyRoutineData } from '../Screens/DailyRoutine';
import { PreferenceData } from '../Screens/PreferenceScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_PROFILE: 'skylar_user_profile',
  DAILY_ROUTINE: 'skylar_daily_routine',
  PREFERENCES: 'skylar_preferences',
  HAS_COMPLETED_ONBOARDING: 'skylar_has_completed_onboarding',
};

const ENABLE_ONBOARDING_ONCE = false;

const isAsyncStorageAvailable = () => {
  return AsyncStorage != null && typeof AsyncStorage.setItem === 'function';
};
export const UserDataManager = {
  isLoading: false,

  getUserProfile() {
    return UserData.getAll();
  },
  

  getDailyRoutine() {
    return DailyRoutineData.getAll();
  },
  

  getPreferences() {
    return PreferenceData.getAll();
  },
  

  getAllUserData() {
    return {
      profile: this.getUserProfile(),
      dailyRoutine: this.getDailyRoutine(),
      preferences: this.getPreferences()
    };
  },
  

  async setOnboardingComplete(complete: boolean) {
    if (!isAsyncStorageAvailable()) return false;
    
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING, JSON.stringify(complete));
      return true;
    } catch (error) {
      return false;
    }
  },


  async hasCompletedOnboarding() {
    if (!isAsyncStorageAvailable()) return false;
    
    try {
      const value = await AsyncStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ONBOARDING);
      return value === 'true';
    } catch (error) {
      return false;
    }
  },


  async saveAllData() {
    if (!isAsyncStorageAvailable()) {
      return false;
    }
    
    try {
      const userData = this.getAllUserData();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userData.profile));
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_ROUTINE, JSON.stringify(userData.dailyRoutine));
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(userData.preferences));
      
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
      
      return true;
    } catch (error) {
      return false;
    }
  },
  

  async saveUserProfile() {
    if (!isAsyncStorageAvailable()) {
      return false;
    }
    
    try {
      const profile = this.getUserProfile();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return true;
    } catch (error) {
      return false;
    }
  },
  

  async saveDailyRoutine() {
    if (!isAsyncStorageAvailable()) {
      return false;
    }
    
    try {
      const routine = this.getDailyRoutine();
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_ROUTINE, JSON.stringify(routine));
      return true;
    } catch (error) {
      return false;
    }
  },
  

  async savePreferences() {
    if (!isAsyncStorageAvailable()) {
      return false;
    }
    
    try {
      const preferences = this.getPreferences();
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
      return true;
    } catch (error) {
      return false;
    }
  },
  

  async loadAllData() {
    if (!isAsyncStorageAvailable()) {
      return false;
    }
    
    try {
      this.isLoading = true;
      
      const profileJson = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileJson) {
        const profile = JSON.parse(profileJson);
        UserData.setAll(profile);
      }
      
      const routineJson = await AsyncStorage.getItem(STORAGE_KEYS.DAILY_ROUTINE);
      if (routineJson) {
        const routine = JSON.parse(routineJson);
        DailyRoutineData.setAll(routine);
      }
      
      const preferencesJson = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      if (preferencesJson) {
        const preferences = JSON.parse(preferencesJson);
        PreferenceData.setAll(preferences);
      }
      
      return true;
    } catch (error) {
      return false;
    } finally {
      this.isLoading = false;
    }
  },
  

  async clearAllData() {
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
    if (isAsyncStorageAvailable()) {
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
        await AsyncStorage.removeItem(STORAGE_KEYS.DAILY_ROUTINE);
        await AsyncStorage.removeItem(STORAGE_KEYS.PREFERENCES);
      } catch (error) {
      }
    }
    
    return true;
  }
}; 