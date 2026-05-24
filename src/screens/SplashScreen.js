import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, StatusBar, Image, Platform,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const APP_ICON = require('../../assets/images/icona app.png');

const { width, height } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const { isLoggedIn, isAdmin, loading } = useApp();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const [splashReady, setSplashReady] = useState(false);

  // Animazione splash — tempo minimo di visualizzazione
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5,    useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 900,  useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => setSplashReady(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Naviga solo quando ENTRAMBI sono pronti: splash terminata + sessione verificata
  useEffect(() => {
    // Intercetta subito il flusso di reset password prima di qualsiasi altra navigazione
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        navigation.replace('ResetPassword');
        return;
      }
    }
    if (!splashReady || loading) return;
    navigation.replace(
      isLoggedIn ? (isAdmin ? 'AdminTabs' : 'MainTabs') : 'Login'
    );
  }, [splashReady, loading, isLoggedIn, isAdmin]);

  return (
    <LinearGradient
      colors={['#0A0A0A', '#1A1A1A', '#0D1B2A']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* Sfondo artistico Noci - pattern decorativo */}
      <View style={styles.bgPattern}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={[styles.circle, {
            width: 80 + i * 40,
            height: 80 + i * 40,
            opacity: 0.03 + i * 0.01,
            top: height * 0.15 - (i * 20),
            left: width * 0.5 - (40 + i * 20),
            borderRadius: 40 + i * 20,
          }]} />
        ))}
      </View>

      {/* Decorazione paesaggio Noci - linee architettoniche */}
      <View style={styles.architectureContainer}>
        <View style={styles.archLine1} />
        <View style={styles.archLine2} />
        <View style={styles.archDot} />
        <View style={[styles.archDot, { left: width * 0.7, top: height * 0.72 }]} />
        <View style={[styles.archDot, { left: width * 0.2, top: height * 0.68 }]} />
        {/* Silhouette trullo stilizzato */}
        <View style={styles.trulloBase} />
        <View style={styles.trulloCone} />
        <View style={[styles.trulloBase, { left: width * 0.65, width: 30 }]} />
        <View style={[styles.trulloCone, { left: width * 0.65 + 5, borderLeftWidth: 20, borderRightWidth: 20, borderBottomWidth: 28 }]} />
      </View>

      <Animated.View
        style={[styles.logoContainer, {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
        }]}
      >
        <View style={styles.iconRing}>
          <Image source={APP_ICON} style={styles.logoImage} resizeMode="cover" />
        </View>
        <Text style={styles.salonTitle}>THE HAIR STUDIO</Text>
        <Text style={styles.salonSub}>Noci • Puglia</Text>
      </Animated.View>

      {/* Loading dots */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} delay={i * 200} />
        ))}
      </Animated.View>
    </LinearGradient>
  );
}

function LoadingDot({ delay }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return <Animated.View style={[styles.dot, { opacity }]} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPattern: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#C9A84C',
  },
  architectureContainer: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: height * 0.35,
  },
  archLine1: {
    position: 'absolute',
    bottom: height * 0.08,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.15)',
  },
  archLine2: {
    position: 'absolute',
    bottom: height * 0.12,
    left: width * 0.1,
    right: width * 0.1,
    height: 1,
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  archDot: {
    position: 'absolute',
    left: width * 0.45,
    top: height * 0.7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(201,168,76,0.3)',
  },
  trulloBase: {
    position: 'absolute',
    bottom: height * 0.08,
    left: width * 0.15,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: 3,
  },
  trulloCone: {
    position: 'absolute',
    bottom: height * 0.08 + 40,
    left: width * 0.15 + 5,
    width: 0,
    height: 0,
    borderLeftWidth: 25,
    borderRightWidth: 25,
    borderBottomWidth: 35,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(201,168,76,0.1)',
  },
  logoContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconRing: {
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 2.5, borderColor: '#C9A84C',
    overflow: 'hidden', marginBottom: 24,
    shadowColor: '#C9A84C', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  logoImage: {
    width: 240,
    height: 240,
    marginLeft: -40,
    marginTop: -40,
  },
  salonTitle: {
    fontSize: 24, fontWeight: '900', color: '#FFFFFF',
    letterSpacing: 6, marginBottom: 6,
  },
  salonSub: {
    fontSize: 12, color: '#C9A84C', letterSpacing: 4,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#C9A84C',
  },
});
