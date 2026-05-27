import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { View, Image, StyleSheet, Text, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';

export default function Index() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [splashDone, setSplashDone] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      if (!cancelled) setSplashDone(true);
    }, 5500);

    // Check and apply OTA update silently during splash screen
    if (!__DEV__) {
      (async () => {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable && !cancelled) {
            setUpdating(true);
            await Updates.fetchUpdateAsync();
            if (!cancelled) {
              clearTimeout(timer);
              // Restart app with new code — user just sees the logo reload
              await Updates.reloadAsync();
            }
          }
        } catch (_) {
          // Never block the app on update failure
        }
      })();
    }

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <Image source={require('../assets/splash-logo.png')} style={styles.logo} resizeMode="contain" />
        {updating && (
          <View style={styles.updateRow}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.updateText}>Updating app...</Text>
          </View>
        )}
      </View>
    );
  }

  if (isAuthenticated && user?.role === 'RIDER') return <Redirect href="/(rider)" />;
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
  updateRow: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
});
