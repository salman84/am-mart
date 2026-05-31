import { useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../src/store';
import { View, Image, StyleSheet, AppState, AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * OTA update strategy — fully invisible to customers:
 *
 *  1. On every app launch the splash shows for 2.5 s.
 *  2. During that time we silently check + download any available update.
 *  3. We NEVER call reloadAsync() while the user is actively using the app.
 *     Instead we set a flag: `updateReadyRef = true`.
 *  4. The AppState listener watches for the app to go BACKGROUND → ACTIVE.
 *     On that transition, if an update was downloaded, we reload — the user
 *     just sees the normal splash screen, identical to a fresh open.
 *  5. If the update finishes BEFORE the splash is done (fast connection),
 *     we silently reload during the splash — customer sees nothing unusual.
 */
export default function Index() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [splashDone, setSplashDone] = useState(false);
  const updateReadyRef  = useRef(false);   // update downloaded, waiting for good moment
  const splashDoneRef   = useRef(false);   // tracks if splash already finished
  const appStateRef     = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    let cancelled = false;

    // ── Splash timer (2.5 s — feels instant but gives network a moment) ───
    const timer = setTimeout(() => {
      if (!cancelled) {
        splashDoneRef.current = true;
        setSplashDone(true);
      }
    }, 2500);

    // ── Silent OTA check (production only) ────────────────────────────────
    if (!__DEV__) {
      (async () => {
        try {
          const check = await Updates.checkForUpdateAsync();
          if (check.isAvailable && !cancelled) {
            await Updates.fetchUpdateAsync();          // download silently
            updateReadyRef.current = true;

            // If still on splash → reload now (user sees nothing unusual)
            if (!splashDoneRef.current && !cancelled) {
              clearTimeout(timer);
              await Updates.reloadAsync();             // looks like normal boot
            }
            // Otherwise we wait for the next background→foreground transition
          }
        } catch (_) {
          /* never block app on update failure */
        }
      })();
    }

    // ── AppState: apply update only when user naturally re-opens the app ──
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      // background/inactive → active  =  user just switched back to the app
      if (
        (prev === 'background' || prev === 'inactive') &&
        next === 'active' &&
        updateReadyRef.current &&
        !__DEV__
      ) {
        updateReadyRef.current = false;
        try { await Updates.reloadAsync(); } catch (_) { /* silent */ }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  // ── Splash screen ─────────────────────────────────────────────────────────
  if (!splashDone) {
    return (
      <View style={styles.splash}>
        <Image
          source={require('../assets/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* No loading text — completely invisible update experience */}
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
