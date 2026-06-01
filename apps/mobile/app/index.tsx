import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useBranding } from '../src/context/BrandingContext';

const LOCAL_LOGO = require('../assets/splash-logo.png');

/**
 * Dynamic splash screen — logo and background color come from admin settings.
 *
 * Flow:
 *  1. Show immediately with cached branding (from AsyncStorage — instant, no API).
 *  2. BrandingContext loads fresh data from API in parallel.
 *  3. After 2.5 s → navigate to the correct screen.
 *
 * Admin changes to SPLASH_LOGO and SPLASH_BG_COLOR take effect on the NEXT
 * app launch (the cache is written after every API fetch).
 */
export default function Index() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { splashLogo, splashBgColor, loaded } = useBranding();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!splashDone) {
    // Dynamic splash: logo and bg color from admin settings, fallback to bundled asset
    const bgColor = splashBgColor || '#183522';
    const hasRemoteLogo = splashLogo && (splashLogo.startsWith('https://') || splashLogo.startsWith('data:'));

    return (
      <View style={[styles.splash, { backgroundColor: bgColor }]}>
        {hasRemoteLogo ? (
          <Image
            source={{ uri: splashLogo }}
            style={styles.logo}
            resizeMode="contain"
            // If remote image fails, it just shows the bg color — acceptable for splash
          />
        ) : (
          <Image
            source={LOCAL_LOGO}
            style={styles.logo}
            resizeMode="contain"
          />
        )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 240,
    height: 240,
  },
});
