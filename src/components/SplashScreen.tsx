import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SCREEN_HEIGHT, SCREEN_WIDTH} from '../constants/dimesions';

const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#4C84E3" barStyle="light-content" />
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}>
        <View style={styles.contentContainer}>
          {/* Weather Icon */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/icons/Umbrella.png')}
              style={styles.logoImage}
            />
          </View>

          {/* App Name */}
          <Text style={styles.appName}>WeatherSense</Text>
          
          {/* Tagline */}
          <Text style={styles.tagline}>
            Smarter Weather. Better Days.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#b3d4ff',
  },
  background: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
    tintColor: '#333', // Added to match the text color
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 15,
    color: '#333',
    opacity: 0.7,
  },
});

export default SplashScreen; 