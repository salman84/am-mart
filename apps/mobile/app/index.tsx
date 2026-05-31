import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { View, Image, StyleSheet } from 'react-native';

/**
 * Splash screen shown for 2.5 s on every launch.
 * OTA update logic lives in _layout.tsx (always mounted) — not here.
 */
export default function Index() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../assets/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (isAuthenticated && user?.role === 'RIDER')  return <Redirect href="/(rider)" />;
  if (isAuthenticated && user?.role === 'SELLER') return <Redirect href="/(seller)" />;
  return <Redirect href="/(customer)" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#183522',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
});
