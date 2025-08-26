import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import adjust from '../utils/adjust';
import {SCREEN_HEIGHT, SCREEN_WIDTH} from '../constants/dimesions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icons from 'react-native-vector-icons/Feather';
import {UserDataManager} from '../utils/userDataManager';

const WelcomeScreen = ({navigation, route}: {navigation: any; route: any}) => {
  React.useEffect(() => {
    // Hide header on mount
    if (navigation && navigation.setOptions) {
      navigation.setOptions({
        headerShown: false,
      });
    }

    // Check if user data already exists, then redirect to main app
    const checkExistingUser = async () => {
      try {
        // Load data from AsyncStorage first
        await UserDataManager.loadAllData();
        
        // ONBOARDING_DISABLED: Comment out the auto-redirect to make onboarding always accessible
        // To re-enable onboarding redirect, uncomment the following block:
        
        const userData = UserDataManager.getAllUserData();
        const hasCompleteUserData =
          userData.profile &&
          userData.profile.location &&
          userData.dailyRoutine &&
          userData.preferences;

        if (hasCompleteUserData) {
          navigation.replace('MainApp');
        }
        
      } catch (error) {
        console.error('Error checking user data:', error);
      }
    };

    // Run the check in the background
    requestAnimationFrame(() => {
      checkExistingUser();
    });
  }, [navigation, route?.params?.bypassOnboardingCheck]);

  const handleNavigate = () => {
    navigation.navigate('UserInfo');
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000000" barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{flexGrow: 1}}>
        <LinearGradient
          colors={['#b3d4ff', '#5c85e6']}
          style={styles.background}>
          {/* Background Bubbles */}
          <View
            style={[
              styles.bubble,
              {
                top: '8%',
                left: '20%',
                width: SCREEN_WIDTH * 0.2,
                height: SCREEN_WIDTH * 0.2,
                opacity: 0.12,
              },
            ]}
          />
          <View
            style={[
              styles.bubble,
              {
                top: '20%',
                right: '9%',
                width: SCREEN_WIDTH * 0.15,
                height: SCREEN_WIDTH * 0.15,
                opacity: 0.1,
              },
            ]}
          />
          <View
            style={[
              styles.bubble,
              {
                bottom: '70%',
                left: '15%',
                width: SCREEN_WIDTH * 0.18,
                height: SCREEN_WIDTH * 0.18,
                opacity: 0.12,
              },
            ]}
          />

          <View style={styles.contentContainer}>
            {/* Weather Icon Cloud with Sun */}
            <View style={styles.logoContainer}>
              <View style={styles.cloudSunContainer}>
                <Icon name="cloud-outline" size={adjust(100)} color="#7490E5" />
                <View style={styles.sunPosition}>
                  <Icons name="sun" size={adjust(32)} color="#FFC857" />
                </View>
              </View>
            </View>

            {/* Welcome Text */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeTitle}>Welcome to Skylar</Text>
              <Text style={styles.welcomeSubtitle}>
                Weather shouldn't just inform—it{'\n'}should guide your day.
              </Text>
            </View>

            {/* Weather Icons Grid */}
            <View style={styles.iconsGrid}>
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <Feather name="sun" size={adjust(25)} color="#ffffff80" />
                </View>
                <View style={styles.iconCircle}>
                  <Feather
                    name="cloud-rain"
                    size={adjust(25)}
                    color="#ffffff80"
                  />
                </View>
              </View>
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <MaterialCommunityIcons
                    name="run"
                    size={adjust(25)}
                    color="#ffffff80"
                  />
                </View>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="umbrella-outline"
                    size={adjust(25)}
                    color="#ffffff80"
                  />
                </View>
              </View>
              <View style={styles.iconRow}>
                <View style={styles.iconCircle}>
                  <Feather name="cloud" size={adjust(32)} color="#ffffff80" />
                </View>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="cafe-outline"
                    size={adjust(25)}
                    color="#ffffff80"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.bottomContainer}>
            {/* CTA Button */}
            <TouchableOpacity
              style={styles.button}
              activeOpacity={0.8}
              onPress={handleNavigate}>
              <Text
                style={styles.buttonText}
                numberOfLines={1}
                ellipsizeMode="tail">
                Let's Personalize Your Weather Experience
              </Text>
            </TouchableOpacity>

            {/* Tagline */}
            <Text style={styles.tagline}>
              Your Lifestyle. Your Forecast. AI-Powered
            </Text>
          </View>
        </LinearGradient>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b3d4ff',
  },
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    paddingHorizontal: adjust(24),
    paddingTop:
      Platform.OS === 'ios' ? 12 : (StatusBar.currentHeight || 0) + 12,
    paddingBottom: 16,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: adjust(90),
  },
  cloudSunContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sunPosition: {
    position: 'absolute',
    top: adjust(32),
    right: adjust(35),
  },
  welcomeTextContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  welcomeTitle: {
    fontSize: adjust(22),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: adjust(4),
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: adjust(13),
    color: '#555',
    textAlign: 'center',
    lineHeight: adjust(18),
  },
  iconsGrid: {
    width: '100%',
    marginTop: 16,
    opacity: 0.4,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: adjust(16),
  },
  iconCircle: {
    width: adjust(50),
    height: adjust(50),
    borderRadius: adjust(25),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
  },
  button: {
    width: '90%',
    backgroundColor: '#517FE0',
    paddingVertical: adjust(12),
    borderRadius: adjust(25),
    alignItems: 'center',
    marginBottom: adjust(8),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    paddingHorizontal: adjust(10),
  },
  buttonText: {
    color: '#fff',
    fontSize: adjust(11),
    fontWeight: 'bold',
  },
  tagline: {
    color: '#333',
    fontSize: adjust(11),
    fontWeight: '400',
    // marginTop: adjust(0),
    // marginBottom: adjust(20),
  },
});

export default WelcomeScreen;
