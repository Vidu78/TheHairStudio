import 'react-native-gesture-handler';
import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import InstallPWABanner from './src/components/InstallPWABanner';

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setReady(true);
    } else {
      const t = setTimeout(() => setReady(true), 3000);
      return () => clearTimeout(t);
    }
  }, [fontsLoaded, fontError]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0F0F0F' }} />;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <AppNavigator />
        <InstallPWABanner />
      </AppProvider>
    </SafeAreaProvider>
  );
}
