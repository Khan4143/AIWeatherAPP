import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './Navigations'; // Adjust the path if needed

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
