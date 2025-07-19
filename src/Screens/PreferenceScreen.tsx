import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import adjust from '../utils/adjust';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants/dimesions';
import { UserDataManager } from '../utils/userDataManager';

const STANDARD_SPACING = adjust(12);

// Style options
const styleOptions = [
  { id: 'casual', label: 'Casual', description: 'Relaxed daily outfits' },
  { id: 'professional', label: 'Professional', description: 'Office/formal attire' },
  { id: 'sporty', label: 'Sporty', description: 'Activewear or outdoor gear' },
];

// Health concern options
const healthOptions = [
  { id: 'allergies', label: 'Allergies', icon: 'allergy' },
  { id: 'asthma', label: 'Asthma', icon: 'lungs' },
  { id: 'sensitivity', label: 'Sensitivity', icon: 'snowflake-o' },
  { id: 'migraine', label: 'Migraine', icon: 'emoticon-sick-outline', iconFamily: 'MaterialCommunityIcons' },
  { id: 'arthritis', label: 'Arthritis', icon: 'bone' },
  { id: 'skin', label: 'Skin Issues', icon: 'hand-paper-o' },
  { id: 'heart', label: 'Heart Issues', icon: 'heartbeat' },
];

// Activity options
const activityOptions = [
  { id: 'bbq', label: 'BBQ', icon: 'restaurant' },
  { id: 'hiking', label: 'Hiking', icon: 'hiking', iconFamily: 'FontAwesome5' },
  { id: 'outdoor', label: 'Outdoor Party', icon: 'outdoor-grill', iconFamily: 'MaterialIcons' },
  { id: 'beach', label: 'Beach', icon: 'beach', iconFamily: 'MaterialCommunityIcons' },
  { id: 'camping', label: 'Camping', icon: 'campground', iconFamily: 'FontAwesome5' },
  { id: 'sports', label: 'Sports', icon: 'sports-soccer', iconFamily: 'MaterialIcons' },
  { id: 'gardening', label: 'Gardening', icon: 'leaf' },
  { id: 'cycling', label: 'Cycling', icon: 'bicycle' },
];

// Create a global object to store user preferences
interface PreferenceDataType {
  style: string | null;
  healthConcerns: string[];
  activities: string[];
}

export const PreferenceData = {
  style: null as string | null,
  healthConcerns: [] as string[],
  activities: [] as string[],
  getAll: function(): PreferenceDataType {
    return {
      style: this.style,
      healthConcerns: [...this.healthConcerns],
      activities: [...this.activities],
    };
  },
  setAll: function(data: Partial<PreferenceDataType>): void {
    this.style = data.style ?? this.style;
    this.healthConcerns = data.healthConcerns ? [...data.healthConcerns] : this.healthConcerns;
    this.activities = data.activities ? [...data.activities] : this.activities;
  },
};

const PreferenceScreen = ({ navigation }: { navigation: any }) => {
  // State for preferences
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedHealthConcerns, setSelectedHealthConcerns] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef(null);
  const healthSliderRef = useRef<FlatList>(null);
  const activitySliderRef = useRef<FlatList>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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
    navigation.goBack('DailyRoutine');
  };

  const handleNext = async () => {
    // Save data to PreferenceData global object
    PreferenceData.setAll({
      style: selectedStyle,
      healthConcerns: selectedHealthConcerns,
      activities: selectedActivities,
    });
    
    // Save to AsyncStorage
    try {
      await UserDataManager.savePreferences();
      console.log('Preference data saved successfully');
    } catch (error) {
      console.error('Error saving preference data:', error);
    }
    
    // Navigate to next screen
    navigation.navigate('OnboardingScreen');
  };

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const needsScrollView = contentHeight > SCREEN_HEIGHT;

  // Selection handlers
  const selectStyle = (styleId: string) => {
    setSelectedStyle(styleId);
  };

  const toggleHealthConcern = (concernId: string) => {
    setSelectedHealthConcerns(prev => {
      if (prev.includes(concernId)) {
        return prev.filter(id => id !== concernId);
      } else {
        // Limit to 3 selections
        if (prev.length < 3) {
          return [...prev, concernId];
        } else {
          return prev; // Already at max selections
        }
      }
    });
  };

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

  // Render health concern item for FlatList
  const renderHealthItem = ({ item }: { item: typeof healthOptions[0] }) => {
    const isSelected = selectedHealthConcerns.includes(item.id);
    
    // Determine which icon library to use based on the icon name
    let IconComponent = MaterialCommunityIcons;
    if (['snowflake-o', 'hand-paper-o', 'heartbeat'].includes(item.icon)) {
      IconComponent = FontAwesome;
    }
    
    return (
      <TouchableOpacity 
        style={[
          styles.pillButton, 
          isSelected && styles.selectedPillButton,
        ]} 
        onPress={() => toggleHealthConcern(item.id)}
      >
        <IconComponent 
          name={item.icon as any} 
          size={adjust(14)} 
          color={isSelected ? "#fff" : "#517FE0"} 
          style={styles.pillIcon}
        />
        <Text 
          style={[
            styles.pillText, 
            isSelected && styles.selectedPillText
          ]}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

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
          color={selectedActivities.includes(item.id) ? "#fff" : "#517FE0"} 
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
    <View style={styles.container}>
      {/* Custom Header with Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.8}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={adjust(20)} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Title Section */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>What should Skylar help you manage?</Text>
      </View>

      {/* Main Content */}
      <View 
        ref={contentRef}
        style={styles.contentContainer}
        onLayout={handleContentLayout}
      >
        <View style={styles.mainContent}>
          {/* Subtitle Section */}
          <View style={styles.subtitleSection}>
            <Text style={styles.subtitle}>
              Your answers help Skylar personalize health, clothing, and activity tips just for you.
            </Text>
          </View>

          {/* Style Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Choose Your Style</Text>
            <View style={styles.styleOptionsWrapper}>
              {styleOptions.map((style) => (
                <TouchableOpacity
                  key={style.id}
                  style={[styles.styleOptionCard, selectedStyle === style.id && styles.activeStyleOptionCard]}
                  onPress={() => selectStyle(style.id)}
                >
                  <View style={styles.styleTextContainer}>
                    {style.id === 'casual' && (
                      <Ionicons name="shirt-outline" size={adjust(22)} color="#517FE0" style={styles.styleIcon} />
                    )}
                    {style.id === 'professional' && (
                      <Ionicons name="briefcase-outline" size={adjust(22)} color="#517FE0" style={styles.styleIcon} />
                    )}
                    {style.id === 'sporty' && (
                      <Ionicons name="body-outline" size={adjust(22)} color="#517FE0" style={styles.styleIcon} />
                    )}
                    <View>
                      <Text style={styles.styleLabel}>{style.label}</Text>
                      <Text style={styles.styleDescription}>{style.description}</Text>
                    </View>
                  </View>
                  <View style={styles.radioContainer}>
                    <View style={styles.radioOuter}>
                      {selectedStyle === style.id && <View style={styles.radioInner} />}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Health Concerns */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Health Concerns</Text>
            <View style={styles.sliderWrapper}>
              <FlatList
                ref={healthSliderRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={healthOptions}
                renderItem={renderHealthItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pillsContainer}
                snapToAlignment="start"
                decelerationRate="fast"
              />
            </View>
          </View>

          {/* Activities */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Your Activities</Text>
            <View style={styles.sliderWrapper}>
              <FlatList
                ref={activitySliderRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                data={activityOptions}
                renderItem={renderActivityItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.pillsContainer}
                snapToAlignment="start"
                decelerationRate="fast"
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            {renderContent()}
          </ScrollView>
          <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Feather name="arrow-right" size={adjust(16)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#b3d4ff',
  },
  container: {
    flex: 1,
    paddingHorizontal: adjust(12),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: adjust(6),
  },
  backButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(14),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(10),
  },
  contentContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'ios' ? adjust(34) : adjust(20),
  },
  mainContent: {
    flex: 1,
  },
  bottomContainer: {
    paddingBottom: Platform.OS === 'ios' ? adjust(34) : adjust(24),
    paddingTop: adjust(12),
  },
  subtitleSection: {
    marginBottom: adjust(20),
    alignItems: 'center',
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: adjust(12),
  },
  title: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: adjust(11),
    color: '#333',
    textAlign: 'center',
    lineHeight: adjust(16),
  },
  sectionContainer: {
    marginBottom: adjust(12),
  },
  sectionTitle: {
    fontSize: adjust(11),
    fontWeight: '600',
    color: '#333',
    marginBottom: adjust(8),
  },
  styleOptionsWrapper: {
    marginBottom: adjust(4),
  },
  styleOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: adjust(10),
    paddingHorizontal: adjust(15),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(15),
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 0,
  },
  activeStyleOptionCard: {
    borderWidth: 2,
    borderColor: '#517FE0',
  },
  styleTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  styleIcon: {
    marginRight: adjust(10),
  },
  styleLabel: {
    fontSize: adjust(10),
    fontWeight: '600',
    color: '#333',
  },
  styleDescription: {
    fontSize: adjust(10),
    color: '#666',
  },
  radioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuter: {
    width: adjust(20),
    height: adjust(20),
    borderRadius: adjust(10),
    borderWidth: 2,
    borderColor: '#517FE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: adjust(10),
    height: adjust(10),
    borderRadius: adjust(5),
    backgroundColor: '#517FE0',
  },
  sliderWrapper: {
    marginLeft: -adjust(12),
    marginRight: -adjust(12),
  },
  pillsContainer: {
    paddingLeft: adjust(12),
    paddingVertical: adjust(4),
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    backgroundColor: '#517FE0',
  },
  pillIcon: {
    marginRight: adjust(5),
  },
  pillText: {
    fontSize: adjust(10),
    fontWeight: '500',
    color: '#333',
  },
  selectedPillText: {
    color: '#fff',
  },
  nextButton: {
    flexDirection: 'row',
    backgroundColor: '#517FE0',
    alignItems: 'flex-end',
    justifyContent: 'center',
    borderRadius: adjust(22),
    paddingVertical: adjust(10),
    paddingHorizontal: adjust(25),
    width: '90%',
    alignSelf: 'center',
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
  sliderSection: {
    marginBottom: adjust(12),
  },
});

export default PreferenceScreen;
