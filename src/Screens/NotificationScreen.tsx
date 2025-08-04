import React, { useEffect } from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import adjust from '../utils/adjust';
import { SCREEN_WIDTH } from '../constants/dimesions';
import { CommonActions } from '@react-navigation/native';
// import messaging from '@react-native-firebase/messaging';

const NotificationScreen = ({ navigation }: { navigation: any }) => {
  const handleBack = () => {
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleShowForecast = () => {
    // Reset navigation and go to MainApp (with tabs) instead of just Home
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      })
    );
  };



  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <LinearGradient
        colors={['#b3d4ff', '#5c85e6']}
        style={styles.background}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Back Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={handleBack}
            >
              <Ionicons name="chevron-back" size={adjust(20)} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Push Notification Banner */}
          <View style={styles.notificationBanner}>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.appName}>Skylar</Text>
                <Text style={styles.notificationTime}>now</Text>
              </View>
              <View style={styles.notificationBody}>
                <MaterialCommunityIcons name="weather-pouring" size={adjust(24)} color="#4361ee" />
                <Text style={styles.notificationText}>
                  Rain expected for tomorrow's commute! Check now to stay dry!
                </Text>
              </View>
            </View>
          </View>

          {/* Welcome Header */}
          <View style={styles.welcomeHeader}>
            <Text style={styles.welcomeText}>Welcome to Skylar</Text>
          </View>

          {/* Main Weather Card */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherHeader}>
              <MaterialCommunityIcons name="weather-cloudy" size={adjust(32)} color="#4361ee" />
              <Text style={styles.weatherMessage}>
                Psst... I noticed rain tomorrow morning. Want me to help you plan your commute?
              </Text>
            </View>

            <View style={styles.timeLabel}>
              <Ionicons name="time-outline" size={adjust(16)} color="#666" />
              <Text style={styles.timeLabelText}>Tomorrow, 7:00 – 8:00 AM</Text>
            </View>

            <View style={styles.weatherDetails}>
              <View style={styles.weatherInfo}>
                <MaterialCommunityIcons name="weather-pouring" size={adjust(20)} color="#4361ee" />
                <Text style={styles.weatherType}>Rain</Text>
                <Text style={styles.temperature}>16°C</Text>
              </View>
              <Text style={styles.suggestion}>
                Consider leaving by 6:40 AM or 8:30 AM instead.
              </Text>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={styles.footerText}>
            You'll receive smart alerts like this to help plan your day
          </Text>

          {/* Bottom Container with Button */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity 
              style={styles.button}
              activeOpacity={0.9}
              onPress={handleShowForecast}
            >
              <Text style={styles.buttonText}>Show me detailed forecast</Text>
              <Feather name="arrow-right" size={adjust(18)} color="#FFF" />
            </TouchableOpacity>
          </View>
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
    minHeight: '100%',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: adjust(5),
    paddingLeft: adjust(5),
    marginBottom: adjust(10),
  },
  backButton: {
    width: adjust(32),
    height: adjust(32),
    borderRadius: adjust(16),
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: adjust(10),
    marginLeft: adjust(15),
  },
  notificationBanner: {
    paddingHorizontal: adjust(15),
    marginBottom: adjust(20),
  },
  notificationContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(12),
    padding: adjust(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: adjust(6),
  },
  appName: {
    fontSize: adjust(11),
    fontWeight: '600',
    color: '#333',
  },
  notificationTime: {
    fontSize: adjust(10),
    color: '#666',
  },
  notificationBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adjust(8),
  },
  notificationText: {
    flex: 1,
    fontSize: adjust(11),
    color: '#333',
    lineHeight: adjust(16),
  },
  welcomeHeader: {
    alignItems: 'center',
    paddingHorizontal: adjust(15),
    marginBottom: adjust(12),
  },
  welcomeText: {
    fontSize: adjust(16),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  weatherCard: {
    marginHorizontal: adjust(15),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: adjust(12),
    padding: adjust(15),
    marginBottom: adjust(15),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: adjust(10),
    marginBottom: adjust(12),
  },
  weatherMessage: {
    flex: 1,
    fontSize: adjust(12),
    color: '#333',
    lineHeight: adjust(18),
  },
  timeLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adjust(4),
    marginBottom: adjust(12),
  },
  timeLabelText: {
    fontSize: adjust(10),
    color: '#666',
  },
  weatherDetails: {
    backgroundColor: 'rgba(67, 97, 238, 0.1)',
    borderRadius: adjust(10),
    padding: adjust(12),
    marginBottom: adjust(15),
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: adjust(6),
    marginBottom: adjust(8),
  },
  weatherType: {
    fontSize: adjust(12),
    color: '#333',
    fontWeight: '500',
  },
  temperature: {
    fontSize: adjust(12),
    color: '#333',
    fontWeight: '500',
    marginLeft: 'auto',
  },
  suggestion: {
    fontSize: adjust(11),
    color: '#333',
    lineHeight: adjust(16),
  },
  forecastButtonContainer: {
    paddingHorizontal: adjust(15),
    marginBottom: adjust(15),
  },
  forecastButton: {
    backgroundColor: '#517FE0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(22),
    paddingVertical: adjust(12),
    gap: adjust(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  forecastButtonText: {
    color: '#fff',
    fontSize: adjust(11),
    fontWeight: '600',
  },
  footerText: {
    fontSize: adjust(10),
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: adjust(30),
    marginBottom: adjust(20),
  },
  bottomContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 'auto',
    paddingHorizontal: adjust(15),
    marginBottom: adjust(25),
  },
  button: {
    width: '90%',
    backgroundColor: '#517FE0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: adjust(22),
    paddingVertical: adjust(12),
    gap: adjust(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: adjust(11),
    fontWeight: '600',
  },
});

export default NotificationScreen;  