import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import adjust from '../utils/adjust';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../constants/dimesions';

const HomeScreen = ({ navigation }: { navigation: any }) => {
  const [contentHeight, setContentHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
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

  const handleGetStarted = () => {
    navigation.navigate('NotificationScreen');
  };

  const handleSkip = () => {
    navigation.navigate('NotificationScreen');
  };

  const handleMeetSkylar = () => {
    console.log('Play Skylar intro video');
  };

  const handleContentLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setContentHeight(height);
  };

  const needsScrollView = contentHeight > SCREEN_HEIGHT * 0.9;

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {/* Back Button */}
      <View style={styles.statusBarTime}>
        <TouchableOpacity 
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBack}
        >
          <Ionicons name="chevron-back" size={adjust(20)} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Sun Icon */}
      <View style={styles.sunContainer}>
        <View style={styles.sunCircle}>
          <Feather name="sun" size={adjust(28)} color="#FFFFFF" />
        </View>
      </View>

      {/* Welcome Message */}
      <View style={styles.messageContainer}>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>
            Hi! I'm Skylar, your weather companion. I'll ensure weather never disrupts your plans again!
          </Text>
        </View>
      </View>

      {/* Feature Cards */}
      <View style={styles.featuresContainer}>
        <View style={styles.featureRow}>
          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <View style={styles.featureIconContainer}>
              <Feather name="sun" size={adjust(16)} color="#4361ee" />
            </View>
            <Text style={styles.featureLabel}>Personalized{'\n'}Forecasts</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <View style={styles.featureIconContainer}>
              <Feather name="shopping-bag" size={adjust(16)} color="#4361ee" />
            </View>
            <Text style={styles.featureLabel}>Smart{'\n'}Outfit Tips</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard} activeOpacity={0.9}>
            <View style={styles.featureIconContainer}>
              <Feather name="calendar" size={adjust(16)} color="#4361ee" />
            </View>
            <Text style={styles.featureLabel}>Weather-{'\n'}Proof Plans</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Video Section */}
      <View style={styles.videoSection}>
        <View style={styles.videoContainer}>
          <View style={styles.videoContent}>
            <TouchableOpacity 
              style={styles.playButton}
              activeOpacity={0.9}
              onPress={handleMeetSkylar}
            >
              <Ionicons name="play" size={adjust(24)} color="#4361ee" />
            </TouchableOpacity>
          </View>
          <Text style={styles.videoText}>Meet Skylar (30 sec)</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity 
          style={styles.getStartedButton}
          activeOpacity={0.9}
          onPress={handleGetStarted}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
          <Feather name="chevron-right" size={adjust(18)} color="#FFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={handleSkip}
          activeOpacity={0.7}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      {/* <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" /> */}
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {renderContent()}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: adjust(30),
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: adjust(20),
  },
  statusBarTime: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: adjust(5),
    paddingLeft: adjust(5),
    marginBottom: adjust(5),
  },
  timeText: {
    fontSize: adjust(12),
    color: '#000',
    fontWeight: '500',
  },
  sunContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(5),
    marginBottom: adjust(20),
  },
  sunCircle: {
    width: adjust(125),
    height: adjust(125),
    borderRadius: adjust(62.5),
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: adjust(8),
    borderColor: 'rgba(255, 255, 255, 0.19)',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: adjust(25),
  },
  messageBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(15),
    paddingVertical: adjust(15),
    paddingHorizontal: adjust(20),
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  messageText: {
    fontSize: adjust(13),
    color: '#333',
    textAlign: 'center',
    lineHeight: adjust(18),
    fontWeight: '500',
  },
  featuresContainer: {
    marginBottom: adjust(25),
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // paddingHorizontal: adjust(0),
  },
  featureCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(12),
    paddingVertical: adjust(16),
    paddingHorizontal: adjust(8),
    alignItems: 'center',
    width: SCREEN_WIDTH / 3.8,
  },
  featureIconContainer: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: 'rgba(200, 220, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(6),
  },
  featureLabel: {
    fontSize: adjust(11),
    color: '#333',
    textAlign: 'center',
    lineHeight: adjust(14),
    fontWeight: '500',
  },
  videoSection: {
    alignItems: 'center',
    marginBottom: adjust(20),
  },
  videoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(12),
    width: '100%',
    paddingVertical: adjust(15),
  },
  videoContent: {
    height: adjust(130),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: adjust(10),
    borderRadius: adjust(10),
    marginHorizontal: adjust(10),
  },
  playButton: {
    width: adjust(45),
    height: adjust(45),
    borderRadius: adjust(23),
    backgroundColor: 'rgba(200, 220, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoText: {
    fontSize: adjust(13),
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: adjust(15),
    fontWeight: '500',
  },
  bottomActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: adjust(20),
    marginBottom: adjust(10),
  },
  getStartedButton: {
    backgroundColor: '#517FE0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(25),
    paddingVertical: adjust(14),
    width: '100%',
    marginBottom: adjust(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  getStartedText: {
    color: '#fff',
    fontSize: adjust(15),
    fontWeight: '600',
    marginRight: adjust(5),
  },
  skipButton: {
    paddingVertical: adjust(5),
  },
  skipText: {
    color: '#333',
    fontSize: adjust(14),
  },
  backButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(10),
  },  
});

export default HomeScreen;
