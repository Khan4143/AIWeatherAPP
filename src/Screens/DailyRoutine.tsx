import React, { useState, useEffect, useRef } from 'react';
import type { ReactElement } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  StatusBar, 
  ScrollView,
  Platform,
  FlatList,
  Alert,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import adjust from '../utils/adjust';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants/dimesions';
import Icon from 'react-native-vector-icons/AntDesign';
import { UserDataManager } from '../utils/userDataManager';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const STANDARD_SPACING = adjust(12);

// Commute method options
const commuteOptions = [
  { id: 'car', label: 'Car', icon: 'car-outline' },
  { id: 'bus', label: 'Bus', icon: 'bus-outline' },
  { id: 'train', label: 'Train', icon: 'train-outline' },
  { id: 'bicycle', label: 'Bicycle', icon: 'bicycle-outline' },
  { id: 'walk', label: 'Walk', icon: 'walk-outline' },
  { id: 'motorcycle', label: 'Motorcycle', icon: 'motorcycle-outline' },
  { id: 'subway', label: 'Subway', icon: 'subway-outline' },
];

// Activity options
const activityOptions = [
  { id: 'bbq', label: 'BBQ', icon: 'restaurant' },
  { id: 'outdoor', label: 'Outdoor Party', icon: 'outdoor-grill', iconFamily: 'MaterialIcons' },
  { id: 'sports', label: 'Sports', icon: 'sports-soccer', iconFamily: 'MaterialIcons' },
  { id: 'gardening', label: 'Gardening', icon: 'leaf' },
];

// Create a global object to store user routine data
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

export const DailyRoutineData = {
  morningActivity: null as string | null,
  commuteMethod: null as string | null,
  commuteTime: {
    hours: 8,
    minutes: 0,
    isAM: true,
  },
  eveningActivity: null as string | null,
  selectedActivity: null as string | null,
  activities: [] as string[],
  getAll: function(): DailyRoutineType {
    return {
      morningActivity: this.morningActivity,
      commuteMethod: this.commuteMethod,
      commuteTime: this.commuteTime,
      eveningActivity: this.eveningActivity,
      selectedActivity: this.selectedActivity,
      activities: this.activities,
    };
  },
  setAll: function(data: Partial<DailyRoutineType>): void {
    this.morningActivity = data.morningActivity ?? this.morningActivity;
    this.commuteMethod = data.commuteMethod ?? this.commuteMethod;
    if (data.commuteTime) {
      this.commuteTime = { ...this.commuteTime, ...data.commuteTime };
    }
    this.eveningActivity = data.eveningActivity ?? this.eveningActivity;
    this.selectedActivity = data.selectedActivity ?? this.selectedActivity;
    this.activities = data.activities ?? this.activities;
  },
};

// Create a mapping of activity IDs to display names
const activityMapping = {
  // Evening activities
  'sports': 'Sports',
  'gardening': 'Gardening', 
  'dogwalk': 'Dog Walk',
  'social': 'Social Events',
  'movie': 'Netflix/Movie',
  'reading': 'Reading',
  
  // Morning activities
  'running': 'Running',
  'gym': 'Gym',
  'yoga': 'Yoga',
  'dogwalk_morning': 'Dog Walk (Morning)'
};

// Create a reverse mapping from display names to IDs
const reverseActivityMapping: {[key: string]: string} = {};
Object.keys(activityMapping).forEach(key => {
  const displayName = activityMapping[key as keyof typeof activityMapping];
  reverseActivityMapping[displayName] = key;
});

// Morning activity mapping
const morningActivityMapping = {
  'running': 'Running',
  'gym': 'Gym',
  'yoga': 'Yoga',
  'dogwalk_morning': 'Dog Walk'
};

type DailyRoutineProps = {
  navigation: NativeStackNavigationProp<any>;
};

const DailyRoutine = ({ navigation }: DailyRoutineProps): ReactElement => {
  // State for daily routine options
  const [commuteMethod, setCommuteMethod] = useState<string | null>('Car');
  const [commuteHours, setCommuteHours] = useState<number>(8);
  const [commuteMinutes, setCommuteMinutes] = useState<number>(0);
  const [isAM, setIsAM] = useState<boolean>(true);
  
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const commuteSliderRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  // Add state for custom alert modal
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    // Hide header on mount
    if (navigation && navigation.setOptions) {
      navigation.setOptions({
        headerShown: false
      });
    }

    const unsubscribe = navigation.addListener('focus', () => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true });
      }
    });

    return unsubscribe;
  }, [navigation]);

  const handleBack = () => {
    navigation.goBack();
  };

  const collectAllActivities = (): string[] => {
    const allActivities: string[] = [];
    
    // Add all selected activities with proper display names
    selectedActivities.forEach(activityId => {
      // Use the mapping to get display names
      const displayName = activityMapping[activityId as keyof typeof activityMapping];
      if (displayName) {
        allActivities.push(displayName);
      }
    });
    
    return [...new Set(allActivities)]; // Remove duplicates
  };

  const handleNext = async () => {
    // Collect all activities
    const allActivities = collectAllActivities();
    
    // Find the selected morning activity
    const selectedMorningActivity = selectedActivities.find(id => 
      ['running', 'gym', 'yoga', 'dogwalk_morning'].includes(id)
    );
    
    // Find selected evening activities
    const selectedEveningActivities = selectedActivities.filter(id => 
      ['sports', 'gardening', 'dogwalk', 'social', 'movie', 'reading'].includes(id)
    );
    
    // Get activity names for display
    const morningActivityName = selectedMorningActivity 
      ? activityMapping[selectedMorningActivity as keyof typeof activityMapping] 
      : null;
      
    const eveningActivityName = selectedEveningActivities.length > 0
      ? activityMapping[selectedEveningActivities[0] as keyof typeof activityMapping]
      : null;
    
    // Save data to DailyRoutineData global object
    DailyRoutineData.setAll({
      morningActivity: morningActivityName,
      commuteMethod,
      commuteTime: {
        hours: commuteHours,
        minutes: commuteMinutes,
        isAM
      },
      eveningActivity: eveningActivityName,
      selectedActivity: morningActivityName || eveningActivityName,
      activities: allActivities,
    });
    
    // Save to AsyncStorage
    try {
      await UserDataManager.saveDailyRoutine();
      console.log('Daily routine data saved successfully');
    } catch (error) {
      console.error('Error saving daily routine data:', error);
    }
    
    // Navigate to next screen
    navigation.navigate('PreferenceScreen');
  };

  // Add useEffect to load saved data
  useEffect(() => {
    // Load saved data when component mounts
    const loadSavedData = async () => {
      try {
        await UserDataManager.loadAllData();
        const savedData = UserDataManager.getDailyRoutine();
        
        // Set state from saved data
        if (savedData.commuteMethod) setCommuteMethod(savedData.commuteMethod);
        if (savedData.commuteTime) {
          setCommuteHours(savedData.commuteTime.hours);
          setCommuteMinutes(savedData.commuteTime.minutes);
          setIsAM(savedData.commuteTime.isAM);
        }
        
        // For activities, map from saved display names to activity IDs
        if (savedData.activities && savedData.activities.length > 0) {
          const activityIds: string[] = [];
          
          savedData.activities.forEach(activityName => {
            // If it's in our reverse mapping, add the ID
            const activityId = reverseActivityMapping[activityName];
            if (activityId) {
              activityIds.push(activityId);
            }
          });
          
          // Set the selected activities (max 2)
          setSelectedActivities(activityIds.slice(0, 2));
        }
        
        console.log('Loaded daily routine data:', savedData);
      } catch (error) {
        console.error('Error loading daily routine data:', error);
      }
    };
    
    loadSavedData();
  }, []);

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const needsScrollView = contentHeight > SCREEN_HEIGHT;

  // Selection handlers
  const selectCommuteMethod = (method: string) => {
    setCommuteMethod(method);
  };

  // Time adjustment handlers
  const incrementHours = () => {
    setCommuteHours(prev => prev < 12 ? prev + 1 : 1); // 12-hour format
  };

  const decrementHours = () => {
    setCommuteHours(prev => prev > 1 ? prev - 1 : 12); // 12-hour format
  };

  const incrementMinutes = () => {
    setCommuteMinutes(prev => prev < 55 ? prev + 5 : 0);
  };

  const decrementMinutes = () => {
    setCommuteMinutes(prev => prev > 0 ? prev - 5 : 55);
  };

  const toggleAMPM = () => {
    setIsAM(prev => !prev);
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => {
      // Check if this is a morning activity
      const isMorningActivity = ['running', 'gym', 'yoga', 'dogwalk_morning'].includes(activityId);
      
      // If the activity is already selected, remove it
      if (prev.includes(activityId)) {
        return prev.filter(id => id !== activityId);
      } else {
        // For morning activities, ensure only one can be selected
        if (isMorningActivity) {
          // Remove any previously selected morning activity
          const withoutMorningActivities = prev.filter(id => 
            !['running', 'gym', 'yoga', 'dogwalk_morning'].includes(id)
          );
          // Add the new morning activity
          return [...withoutMorningActivities, activityId];
        } else {
          // For evening activities, keep the existing behavior (max 2)
          // Count how many evening activities are already selected
          const selectedEveningActivities = prev.filter(id => 
            ['sports', 'gardening', 'dogwalk', 'social', 'movie', 'reading'].includes(id)
          );
          
          if (selectedEveningActivities.length < 2) {
            return [...prev, activityId];
          } else {
            // Show custom alert instead of using Alert.alert
            setAlertMessage("You can only select up to 2 evening activities. Please deselect one first.");
            setAlertVisible(true);
            // Return the current selections unchanged
            return prev;
          }
        }
      }
    });
  };

  // Render commute method item for FlatList
  const renderCommuteMethodItem = ({ item }: { item: typeof commuteOptions[0] }) => (
    <TouchableOpacity 
      style={[
        styles.commuteOptionButton, 
        commuteMethod === item.id && styles.selectedOption
      ]} 
      onPress={() => selectCommuteMethod(item.id)}
    >
      <Ionicons 
        name={item.icon as any} 
        size={adjust(16)} 
        color={commuteMethod === item.id ? "#fff" : "#333"} 
      />
      <Text 
        style={[
          styles.commuteOptionText, 
          commuteMethod === item.id && styles.selectedOptionText
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );

  // Render activity item for FlatList
  const renderActivityItem = ({ item }: { item: typeof activityOptions[0] }) => {
    let IconComponent;
    switch (item.iconFamily) {
      case 'FontAwesome5':
        IconComponent = FontAwesome5;
        break;
      case 'MaterialIcons':
        IconComponent = MaterialIcons;
        break;
      case 'MaterialCommunityIcons':
        IconComponent = MaterialCommunityIcons;
        break;
      default:
        IconComponent = Ionicons;
    }

    return (
      <TouchableOpacity 
        style={[styles.pillButton, selectedActivities.includes(item.id) && styles.selectedPillButton]} 
        onPress={() => toggleActivity(item.id)}
      >
        <IconComponent 
          name={item.icon} 
          size={adjust(14)} 
          color={selectedActivities.includes(item.id) ? "#fff" : "#333"} 
          style={styles.pillIcon}
        />
        <Text 
          style={[
            styles.pillText, 
            selectedActivities.includes(item.id) && styles.selectedPillText
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View style={styles.mainContent}>
      {/* Custom Header with Back Button and Title */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.8}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={adjust(20)} color="#333" />
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.headerTitle}>Your daily routine matters </Text>
        <Text style={styles.headerTitle}>to Skylar!</Text>
      </View>

      <View style={styles.contentContainer}>
        {/* Morning Activity */}
        <View style={[styles.questionContainer, styles.sectionContainer]}>
          <Text style={styles.questionText}>What do you usually do in the mornings?</Text>
          <View style={styles.selectionCounterContainer}>
            <Text style={[
              styles.counterText,
              selectedActivities.filter(id => ['running', 'gym', 'yoga', 'dogwalk_morning'].includes(id)).length === 1 ? styles.counterTextFull : null
            ]}>
              {selectedActivities.filter(id => ['running', 'gym', 'yoga', 'dogwalk_morning'].includes(id)).length}/1 selected
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('running') && styles.selectedOption]} 
              onPress={() => toggleActivity('running')}
            >
              <Ionicons 
                name="fitness" 
                size={adjust(15)} 
                color={selectedActivities.includes('running') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('running') && styles.selectedOptionText]}>Running</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('gym') && styles.selectedOption]} 
              onPress={() => toggleActivity('gym')}
            >
              <MaterialCommunityIcons 
                name="dumbbell" 
                size={adjust(15)} 
                color={selectedActivities.includes('gym') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('gym') && styles.selectedOptionText]}>Gym</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('yoga') && styles.selectedOption]} 
              onPress={() => toggleActivity('yoga')}
            >
              <MaterialCommunityIcons 
                name="yoga" 
                size={adjust(15)} 
                color={selectedActivities.includes('yoga') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('yoga') && styles.selectedOptionText]}>Yoga</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('dogwalk_morning') && styles.selectedOption]} 
              onPress={() => toggleActivity('dogwalk_morning')}
            >
              <MaterialCommunityIcons 
                name="dog" 
                size={adjust(15)} 
                color={selectedActivities.includes('dogwalk_morning') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('dogwalk_morning') && styles.selectedOptionText]}>Dog Walk</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Commute Method - Horizontal Slider */}
        <View style={[styles.questionContainer, styles.sectionContainer]}>
          <Text style={styles.questionText}>How do you usually get to work or school?</Text>
        </View>

        {/* This FlatList is placed outside of padding container to avoid cutting off */}
        <View style={styles.sliderWrapper}>
          <FlatList
            ref={commuteSliderRef}
            data={commuteOptions}
            renderItem={renderCommuteMethodItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.commuteSliderContainer}
          />
        </View>

        {/* Commute Time */}
        <View style={[styles.questionContainer, styles.sectionContainer]}>
          <View style={styles.timePickerContainer}>
            <Text style={styles.timePickerTitle}><Icon name="clockcircleo" size={adjust(16)} color="#517FE0" />   Commute Time</Text>
            <View style={styles.timePickerControls}>
              {/* Hours */}
              <View style={styles.timeSection}>
                <TouchableOpacity onPress={incrementHours} style={styles.timeButton}>
                  <Ionicons name="chevron-up" size={adjust(16)} color="#333" />
                </TouchableOpacity>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeText}>{commuteHours}</Text>
                </View>
                <TouchableOpacity onPress={decrementHours} style={styles.timeButton}>
                  <Ionicons name="chevron-down" size={adjust(16)} color="#333" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.timeSeparator}>:</Text>
              
              {/* Minutes */}
              <View style={styles.timeSection}>
                <TouchableOpacity onPress={incrementMinutes} style={styles.timeButton}>
                  <Ionicons name="chevron-up" size={adjust(16)} color="#333" />
                </TouchableOpacity>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeText}>{commuteMinutes.toString().padStart(2, '0')}</Text>
                </View>
                <TouchableOpacity onPress={decrementMinutes} style={styles.timeButton}>
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
          
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={adjust(18)} color="#517FE0" />
            <Text style={styles.infoText}>
              Skylar will alert you about delays, rain, or air quality before your commute.
            </Text>
          </View>
        </View>

        {/* Evening Activities */}
        <View style={[styles.questionContainer, styles.sectionContainer]}>
          <Text style={styles.questionText}>What do you enjoy in the evenings?</Text>
          <View style={styles.selectionCounterContainer}>
            <Text style={[
              styles.counterText,
              selectedActivities.filter(id => ['sports', 'gardening', 'dogwalk', 'social', 'movie', 'reading'].includes(id)).length === 2 ? styles.counterTextFull : null
            ]}>
              {selectedActivities.filter(id => ['sports', 'gardening', 'dogwalk', 'social', 'movie', 'reading'].includes(id)).length}/2 selected
            </Text>
          </View>
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('sports') && styles.selectedOption]} 
              onPress={() => toggleActivity('sports')}
            >
              <MaterialCommunityIcons 
                name="basketball" 
                size={adjust(15)} 
                color={selectedActivities.includes('sports') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('sports') && styles.selectedOptionText]}>Sports</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('gardening') && styles.selectedOption]} 
              onPress={() => toggleActivity('gardening')}
            >
              <MaterialCommunityIcons 
                name="flower" 
                size={adjust(15)} 
                color={selectedActivities.includes('gardening') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('gardening') && styles.selectedOptionText]}>Gardening</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('dogwalk') && styles.selectedOption]} 
              onPress={() => toggleActivity('dogwalk')}
            >
              <MaterialCommunityIcons 
                name="dog" 
                size={adjust(15)} 
                color={selectedActivities.includes('dogwalk') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('dogwalk') && styles.selectedOptionText]}>Dog Walk</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('social') && styles.selectedOption]} 
              onPress={() => toggleActivity('social')}
            >
              <MaterialCommunityIcons 
                name="account-group" 
                size={adjust(15)} 
                color={selectedActivities.includes('social') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('social') && styles.selectedOptionText]}>Social Events</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('movie') && styles.selectedOption]} 
              onPress={() => toggleActivity('movie')}
            >
              <MaterialCommunityIcons 
                name="movie-open" 
                size={adjust(15)} 
                color={selectedActivities.includes('movie') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('movie') && styles.selectedOptionText]}>Netflix/Movie</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.optionButton, selectedActivities.includes('reading') && styles.selectedOption]} 
              onPress={() => toggleActivity('reading')}
            >
              <MaterialCommunityIcons 
                name="book-open-variant" 
                size={adjust(15)} 
                color={selectedActivities.includes('reading') ? "#fff" : "#333"} 
              />
              <Text style={[styles.optionText, selectedActivities.includes('reading') && styles.selectedOptionText]}>Reading</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Next Button */}
        <TouchableOpacity 
          style={styles.nextButton} 
          activeOpacity={0.8}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Feather name="chevron-right" size={adjust(18)} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <View 
          ref={contentRef} 
          onLayout={handleContentLayout} 
          style={[styles.measureContainer, { position: 'absolute', opacity: 0 }]}
        >
          {renderContent()}
        </View>
        
        {needsScrollView ? (
          <ScrollView 
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={styles.scrollContainer}
            overScrollMode="never"
          >
            {renderContent()}
          </ScrollView>
        ) : (
          renderContent()
        )}

      
      </LinearGradient>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b3d4ff',
  },
  measureContainer: {
    width: '100%',
  },
  scrollContainer: {
    paddingBottom: adjust(20),
  },
  background: {
    flex: 1,
  },
  mainContent: {
    width: '100%',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: adjust(12),
    width: '100%',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    // marginBottom: adjust(12),
  },
  backButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(14),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(10),
    marginLeft: adjust(10),
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: adjust(12),
  },
  headerTitle: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  questionContainer: {
    width: '100%',
  },
  sectionContainer: {
  marginTop: adjust(8),
    width: '100%',
  },
  questionText: {
    fontSize: adjust(11),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(8),
    flexWrap: 'wrap',
    gap: adjust(8),
    width: '100%',
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  selectedOption: {
    backgroundColor: '#7698ee',
  },
  optionText: {
    fontSize: adjust(10),
    fontWeight: '500',
    color: '#333',
    marginLeft: adjust(4),
  },
  selectedOptionText: {
    color: '#fff',
  },
  sliderWrapper: {
    width: SCREEN_WIDTH,
    marginBottom: adjust(12),
    marginLeft: -adjust(12), // Compensate for the universal padding
    overflow: 'hidden',
  },
  commuteSliderContainer: {
    paddingVertical: adjust(4),
    paddingLeft: adjust(12), // Add back padding on the left to align with content
  },
  commuteOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(8),
    paddingVertical: adjust(8),
    marginRight: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    minWidth: adjust(80),
  },
  commuteOptionText: {
    fontSize: adjust(10),
    fontWeight: '500',
    color: '#333',
    marginLeft: adjust(4),
  },
  timePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: adjust(12),
    padding: adjust(8),
    width: '100%',
  },
  timePickerTitle: {
    fontSize: adjust(11),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  timePickerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: adjust(4),
    
  },
  timeSection: {
    alignItems: 'center',
  },
  timeButton: {
    padding: adjust(4),
  },
  timeDisplay: {
    width: adjust(24),
    height: adjust(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
  },
  timeSeparator: {
    fontSize: adjust(14),
    fontWeight: '600',
    color: '#333',
    marginHorizontal: adjust(8),
  },
  ampmContainer: {
    marginLeft: adjust(16),
    flexDirection: 'column',
    borderRadius: adjust(8),
    overflow: 'hidden',
  },
  ampmButton: {
    paddingVertical: adjust(4),
    paddingHorizontal: adjust(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  ampmActive: {
    backgroundColor: '#7698ee',
  },
  ampmText: {
    fontSize: adjust(10),
    fontWeight: '500',
    color: '#333',
  },
  ampmActiveText: {
    color: '#fff',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: adjust(8),
    padding: adjust(8),
    marginTop: adjust(8),
    marginBottom: adjust(8),
  },
  infoText: {
    fontSize: adjust(10),
    color: '#333',
    marginLeft: adjust(4),
    flex: 1,
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#517FE0',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(22),
    paddingVertical: adjust(10),
    paddingHorizontal: adjust(25),
    marginTop: adjust(16),
    marginBottom: adjust(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  nextButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: adjust(14),
    marginRight: adjust(4),
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: adjust(20),
    paddingVertical: adjust(8),
    paddingHorizontal: adjust(14),
    marginRight: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.5,
    elevation: 2,
  },
  selectedPillButton: {
    backgroundColor: '#7698ee',
  },
  pillIcon: {
    marginRight: adjust(5),
  },
  pillText: {
    fontSize: adjust(14),
    fontWeight: '500',
    color: '#333',
  },
  selectedPillText: {
    color: '#fff',
  },
  selectionCounterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: adjust(8),
  },
  counterText: {
    fontSize: adjust(10),
    color: '#666',
    fontWeight: '500',
  },
  counterTextFull: {
    color: '#517FE0',
  },
  
});

export default DailyRoutine;