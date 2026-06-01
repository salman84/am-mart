/**
 * BrandingContext — fetches app settings once from the public API and shares
 * them across the whole app. Re-fetches when app comes to foreground so icon
 * changes made in the admin panel are picked up instantly.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appSettingsApi, clearApiCache } from '../services/api';

const BRANDING_CACHE_KEY = '@ammart_branding_cache';

export interface Branding {
  appName: string;
  appLogo: string;        // Header logo URL
  appIconLogo: string;    // App icon logo URL
  splashLogo: string;     // Splash screen logo URL
  splashBgColor: string;  // Splash screen background color
  // Main page quick-service icons (image URLs — empty = use built-in Ionicons)
  iconTopup: string;
  iconSimCards: string;
  iconRateInquiry: string;
  currency: string;
  loaded: boolean;
  reload: () => void;
}

const DEFAULT: Branding = {
  appName:        'AM Mart',
  appLogo:        '',
  appIconLogo:    '',
  splashLogo:     '',
  splashBgColor:  '#10B981',
  iconTopup:      '',
  iconSimCards:   '',
  iconRateInquiry:'',
  currency:       '₩',
  loaded:         false,
  reload:         () => {},
};

const BrandingContext = createContext<Branding>(DEFAULT);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Omit<Branding, 'reload'>>({
    appName:        'AM Mart',
    appLogo:        '',
    appIconLogo:    '',
    splashLogo:     '',
    splashBgColor:  '#10B981',
    iconTopup:      '',
    iconSimCards:   '',
    iconRateInquiry:'',
    currency:       '₩',
    loaded:         false,
  });
  const retryCount = React.useRef(0);

  // ── Helper: convert API data → branding object ──────────────────────────
  const apiToBranding = useCallback((d: any): Omit<Branding, 'reload'> => ({
    appName:        d.APP_NAME         || 'AM Mart',
    appLogo:        d.APP_LOGO         || '',
    appIconLogo:    d.APP_ICON_LOGO    || '',
    splashLogo:     d.SPLASH_LOGO      || '',
    splashBgColor:  d.SPLASH_BG_COLOR  || '#10B981',
    iconTopup:      d.ICON_TOPUP       || '',
    iconSimCards:   d.ICON_SIM_CARDS   || '',
    iconRateInquiry:d.ICON_RATE_INQUIRY || '',
    currency:       d.CURRENCY_SYMBOL  || d.CURRENCY || '₩',
    loaded:         true,
  }), []);

  // ── On first mount: load cached branding from disk (instant, no API wait) ─
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(BRANDING_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          setBranding((prev) => prev.loaded ? prev : { ...parsed, loaded: true });
        }
      } catch {}
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await appSettingsApi.getPublic();
      const d = res.data;
      if (d) {
        retryCount.current = 0;
        const newBranding = apiToBranding(d);
        setBranding(newBranding);
        // Persist to disk so next app launch has instant splash data
        AsyncStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(newBranding)).catch(() => {});
        return;
      }
    } catch {}
    setBranding((b) => ({ ...b, loaded: true }));
    // Retry up to 5 times with increasing delay
    if (retryCount.current < 5) {
      const delay = Math.min(4000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current += 1;
      setTimeout(load, delay);
    }
  }, [apiToBranding]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // ── AUTO-REFRESH SYSTEM ─────────────────────────────────────────────────
  // Polls every 30 seconds while the app is in the foreground.
  // When app goes to background → stops polling (saves battery).
  // When app returns to foreground → immediate refresh + restart polling.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      clearApiCache('/admin/public-settings');
      load();
    }, 30_000); // every 30 seconds
  }, [load]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  // Start polling on mount
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Foreground → immediate refresh + restart polling
  // Background → stop polling to save battery
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        clearApiCache(); // wipes every cached endpoint — next fetch goes to server
        load();
        startPolling();
      } else {
        stopPolling();
      }
    });
    return () => sub.remove();
  }, [load, startPolling, stopPolling]);

  return (
    <BrandingContext.Provider value={{ ...branding, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

/** Use anywhere in the app — zero hardcoded branding/icons */
export function useBranding(): Branding {
  return useContext(BrandingContext);
}
