import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../src/store';
import { loadProfile, logout } from '../src/store/slices/authSlice';
import { View, Image, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { useBranding } from '../src/context/BrandingContext';
import { useLanguage } from '../src/i18n';
import * as SecureStore from 'expo-secure-store';

/**
 * Dynamic splash screen — 100% controlled from Admin Panel.
 *
 * Admin settings used:
 *   SPLASH_LOGO     → Logo image URL shown on splash
 *   SPLASH_BG_COLOR → Background color of splash screen
 *
 * NO hardcoded logo or color. Everything comes from the admin panel
 * via BrandingContext (cached in AsyncStorage for instant display).
 *
 * Flow:
 *  1. Show splash with cached branding (from AsyncStorage — instant, no API).
 *  2. BrandingContext loads fresh data from API in parallel.
 *  3. Wait for language system (first-run picker must complete first).
 *  4. If authenticated, refresh profile from server.
 *  5. After all checks → navigate to the correct screen.
 */
export default function Index() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { splashLogo, splashBgColor } = useBranding();
  const { t, isFirstRun, loading: langLoading } = useLanguage();
  const [splashDone, setSplashDone] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  // On boot: verify token still exists in SecureStore.
  // If Redux says authenticated but SecureStore has no token (app was reinstalled),
  // force logout to clear stale persisted state → shows splash + language picker.
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) {
          // Token gone (uninstall cleared SecureStore) but Redux still has stale auth
          dispatch(logout());
        }
      } catch {
        dispatch(logout());
      }
    })();
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

  // Wait for splash timer + language system + first-run picker
  if (!splashDone || langLoading || isFirstRun) {
    // All values from admin panel via BrandingContext — no hardcoded fallback
    const bgColor = splashBgColor || 'transparent';
    const hasLogo = splashLogo && (splashLogo.startsWith('https://') || splashLogo.startsWith('http://') || splashLogo.startsWith('data:'));

    return (
      <View style={[styles.splash, { backgroundColor: bgColor }]}>
        {hasLogo ? (
          <Image
            source={{ uri: splashLogo }}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
        )}
      </View>
    );
  }

  // Show preparing screen while re-checking profile
  if (isAuthenticated && !profileChecked) {
    const bgColor = splashBgColor || 'transparent';
    const hasLogo = splashLogo && (splashLogo.startsWith('https://') || splashLogo.startsWith('http://'));

    return (
      <View style={[styles.splash, { backgroundColor: bgColor }]}>
        {hasLogo && (
          <Image
            source={{ uri: splashLogo }}
            style={styles.logoSmall}
            resizeMode="contain"
          />
        )}
        <Text style={styles.preparingText}>{t('preparingAccount')}</Text>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
      </View>
    );
  }

  // Check for suspended status
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
});
