import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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

const defaultTabBarStyle = {
  height: adjust(60),
  paddingTop: adjust(5),
  backgroundColor: '#fff',
  borderTopWidth: 1,
  borderTopColor: '#eee',
};

const TabNavigator = () => {
  useEffect(() => {
    console.log('✅ TabNavigator mounted');
    return () => {
      console.log('❌ TabNavigator unmounted');
    };
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4361EE',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: {
          fontSize: adjust(10),
          fontWeight: '500',
          marginBottom: adjust(5),
        },
        tabBarStyle: defaultTabBarStyle,
        // This is the key option that allows the tab bar to be hidden by keyboard
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
            <MaterialCommunityIcons name="robot-outline" size={adjust(24)} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="PlanningTab"
        component={PlanningScreen}
        options={{
          tabBarLabel: 'Plan Event',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="calendar-plus" size={adjust(22)} color={color} />
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
  );
};

export default TabNavigator;

const styles = StyleSheet.create({});
