import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import InstallPWABanner from './src/components/InstallPWABanner';

export default function App() {
  // Pre-load fonts in background. NON blocchiamo il render: l'app usa emoji
  // Unicode per le icone, i font vector-icons servono solo a casi residui.
  useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="light" />
          <AppNavigator />
          <InstallPWABanner />
        </AppProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
