import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../src/store';
import { loadProfile } from '../src/store/slices/authSlice';
import { View, Image, StyleSheet, Text } from 'react-native';
import { useBranding } from '../src/context/BrandingContext';
import { useLanguage } from '../src/i18n';

const LOCAL_LOGO = require('../assets/splash-logo.png');

/**
 * Dynamic splash screen — logo and background color come from admin settings.
 *
 * Flow:
 *  1. Show immediately with cached branding (from AsyncStorage — instant, no API).
 *  2. BrandingContext loads fresh data from API in parallel.
 *  3. If authenticated, refresh profile from server (re-check status).
 *  4. After splash + profile check → navigate to the correct screen.
 *
 * Admin changes to SPLASH_LOGO and SPLASH_BG_COLOR take effect on the NEXT
 * app launch (the cache is written after every API fetch).
 */
export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { splashLogo, splashBgColor } = useBranding();
  const { t } = useLanguage();
  const [splashDone, setSplashDone] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Re-check profile from server when app reopens (detect status changes)
  useEffect(() => {
    if (splashDone && isAuthenticated && !profileChecked) {
      dispatch(loadProfile())
        .finally(() => setProfileChecked(true));
    } else if (splashDone && !isAuthenticated) {
      setProfileChecked(true);
    }
  }, [splashDone, isAuthenticated]);

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

  // Show preparing screen while re-checking profile
  if (isAuthenticated && !profileChecked) {
    const bgColor = splashBgColor || '#183522';
    return (
      <View style={[styles.splash, { backgroundColor: bgColor }]}>
        <Image
          source={splashLogo?.startsWith('https://') ? { uri: splashLogo } : LOCAL_LOGO}
          style={styles.logoSmall}
          resizeMode="contain"
        />
        <Text style={styles.preparingText}>{t('preparingAccount')}</Text>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
        </View>
      </View>
    );
  }

  // Check for suspended status (admin may have changed while user was offline)
  if (isAuthenticated && user?.status === 'SUSPENDED') {
    return <Redirect href={{ pathname: '/(auth)/account-status', params: { status: 'suspended' } }} />;
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
  logoSmall: {
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  preparingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    marginBottom: 16,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
