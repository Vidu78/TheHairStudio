import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './src/components/ErrorBoundary';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import InstallPWABanner from './src/components/InstallPWABanner';

export default function App() {
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
