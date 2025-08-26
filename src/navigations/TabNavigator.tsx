import React, { useEffect } from 'react';
import { StyleSheet, Platform, ViewStyle } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

import ForecastScreen from '../Screens/ForecastScreen';
import HomeScreen from '../Screens/HomeScreen';
import PlanningScreen from '../Screens/PlanningScreen';
import CommuteScreen from '../Screens/CommuteScreen';
import ProfileScreen from '../Screens/ProfileScreen';
import adjust from '../utils/adjust';

export type TabParamList = {
  HomeTab: undefined;
  Assistant: undefined;
  PlanningTab: undefined;
  Commute: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const defaultTabBarStyle: ViewStyle = {
  height: adjust(55),
  backgroundColor: '#fff',
  paddingBottom: Platform.OS === 'ios' ? adjust(15) : adjust(8),
  paddingTop: adjust(8),
  borderTopWidth: 0,
  elevation: 8,
  shadowColor: '#000',
  borderRadius: adjust(15),
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 8,
  position: 'absolute',
  left: adjust(16),
  right: adjust(16),

};


const TabNavigator = () => {
  useEffect(() => {
    return () => {
    };
  }, []);

  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4361EE',
          tabBarInactiveTintColor: '#999',
          tabBarLabelStyle: {
            fontSize: adjust(10),
            fontWeight: '600',
            marginTop: adjust(3),
            marginBottom: Platform.OS === 'ios' ? adjust(10) : adjust(3),
          },
          tabBarStyle: defaultTabBarStyle,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={ForecastScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color }) => (
              <Ionicons name="home" size={adjust(20)} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Assistant"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Assistant',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="robot-outline" size={adjust(22)} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="PlanningTab"
          component={PlanningScreen}
          options={{
            tabBarLabel: 'Plan Event',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="calendar-plus" size={adjust(20)} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Commute"
          component={CommuteScreen}
          options={{
            tabBarLabel: 'Commute',
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="chat" size={adjust(20)} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color }) => (
              <FontAwesome5 name="user" size={adjust(18)} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
};

export default TabNavigator;
