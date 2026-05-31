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
