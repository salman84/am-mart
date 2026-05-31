import { useCallback, useEffect, useRef, Component, ReactNode } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, Platform, Text, ScrollView, AppState } from 'react-native';
import * as Updates from 'expo-updates';
import { store, persistor } from '../src/store';
import { RootState } from '../src/store';
import { Colors } from '../src/theme';
import { LanguageProvider, useLanguage } from '../src/i18n';
import { AppVersionGate } from '../src/components/AppVersionGate';
import { shouldShowLock, recordActivity } from '../src/utils/pinSecurity';
import { BrandingProvider } from '../src/context/BrandingContext';
import { LanguagePickerModal } from '../src/components/LanguagePickerModal';

/** Shows language picker on first install */
function FirstRunLanguagePicker() {
  const { isFirstRun, completeFirstRun, loading } = useLanguage();
  if (loading || !isFirstRun) return null;
  return (
    <LanguagePickerModal
      visible={true}
      onClose={completeFirstRun}
      isFirstRun={true}
    />
  );
}

/** Monitors app going to background → foreground and shows PIN lock if needed */
function PinLockMonitor() {
  const router = useRouter();
  const segments = useSegments();
  const isLoggedIn = useSelector((s: RootState) => s.auth.isAuthenticated);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (next === 'active' && wasBackground && isLoggedIn) {
        const shouldLock = await shouldShowLock();
        if (shouldLock) {
          // Only redirect if not already on an auth screen
          const inAuth = segments[0] === '(auth)';
          if (!inAuth) router.push('/(auth)/pin-lock');
        }
      }
      if (next === 'background') {
        // record when we left
        await recordActivity();
      }
    });
    return () => sub.remove();
  }, [isLoggedIn, segments, router]);

  return null;
}


/**
 * OTA Auto-Updater — lives in the root layout so it NEVER unmounts.
 *
 * Strategy:
 *  1. On mount (app launch): check → download → reload immediately.
 *     If this finishes within the 2.5 s splash in index.tsx the user
 *     sees nothing unusual — it looks like a normal cold boot.
 *  2. After launch, if download took longer than the splash, we set
 *     updateReadyRef = true and apply on the next background → foreground.
 *  3. On every background → foreground:
 *     • If an update was already downloaded → reload now (user just
 *       switched back so the brief splash is natural).
 *     • Otherwise → silently check + download for the NEXT transition.
 *
 * Result: customers never manually update. They just use the app
 * normally and get the latest code without noticing.
 */
function OtaUpdater() {
  const updateReadyRef    = useRef(false);
  const appStateRef       = useRef(AppState.currentState);
  const initialWindowRef  = useRef(true); // true for the first 6 s after launch

  useEffect(() => {
    if (__DEV__) return; // skip in Expo Go / dev builds

    // Close the "initial window" after 6 s (splash is 2.5 s; give extra margin)
    const initTimer = setTimeout(() => { initialWindowRef.current = false; }, 6000);

    // ── Check on launch ────────────────────────────────────────────────────
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!result.isAvailable) return;
        await Updates.fetchUpdateAsync();
        // Still within the splash / boot window → reload looks like normal boot
        if (initialWindowRef.current) {
          await Updates.reloadAsync();
        } else {
          updateReadyRef.current = true; // apply on next foreground
        }
      } catch (_) { /* never block the app */ }
    })();

    // ── Watch background ↔ foreground transitions ─────────────────────────
    const sub = AppState.addEventListener('change', async (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      const comingToForeground =
        (prev === 'background' || prev === 'inactive') && next === 'active';
      if (!comingToForeground) return;

      if (updateReadyRef.current) {
        // Update already downloaded → apply now (reload = fast splash → same screen)
        updateReadyRef.current = false;
        try { await Updates.reloadAsync(); } catch (_) {}
      } else {
        // No update pending → silently check for one; apply on the NEXT foreground
        try {
          const result = await Updates.checkForUpdateAsync();
          if (result.isAvailable) {
            await Updates.fetchUpdateAsync();
            updateReadyRef.current = true;
          }
        } catch (_) {}
      }
    });

    return () => {
      clearTimeout(initTimer);
      sub.remove();
    };
  }, []);

  return null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'red', marginBottom: 12 }}>App Crash</Text>
          <Text style={{ fontSize: 13, color: '#333', fontFamily: 'monospace' }}>
            {(this.state.error as Error).message}{'\n\n'}{(this.state.error as Error).stack}
          </Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const onPersistGateBeforeLift = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.flex}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate
              loading={
                <View style={styles.loading}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              }
              persistor={persistor}
              onBeforeLift={onPersistGateBeforeLift}
            >
              <LanguageProvider>
                <BrandingProvider>
                <FirstRunLanguagePicker />
                <PinLockMonitor />
                <OtaUpdater />

                <StatusBar
                  style="dark"
                  backgroundColor="transparent"
                  translucent={Platform.OS === 'android'}
                />
                <AppVersionGate>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      animation: Platform.OS === 'android' ? 'fade_from_bottom' : 'default',
                      contentStyle: { backgroundColor: Colors.background },
                    }}
                  >
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" options={{ animation: 'none' }} />
                    <Stack.Screen name="(customer)" options={{ animation: 'none' }} />
                    <Stack.Screen name="(rider)" options={{ animation: 'none' }} />
                    <Stack.Screen name="(seller)" options={{ animation: 'none' }} />
                  </Stack>
                </AppVersionGate>
                <Toast position="top" topOffset={Platform.OS === 'ios' ? 60 : 40} />
                </BrandingProvider>
              </LanguageProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background,
  },
});
