import { useCallback, Component, ReactNode } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import Toast from 'react-native-toast-message';
import { StyleSheet, View, ActivityIndicator, Platform, Text, ScrollView } from 'react-native';
import { store, persistor } from '../src/store';
import { Colors } from '../src/theme';
import { LanguageProvider } from '../src/i18n';
import { AppVersionGate } from '../src/components/AppVersionGate';

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
