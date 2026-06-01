/**
 * BrandingContext — fetches app settings once from the public API and shares
 * them across the whole app. Re-fetches when app comes to foreground so icon
 * changes made in the admin panel are picked up instantly.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { appSettingsApi, clearApiCache } from '../services/api';

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

  const load = useCallback(async () => {
    try {
      const res = await appSettingsApi.getPublic();
      const d = res.data;
      if (d) {
        retryCount.current = 0;
        setBranding({
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
        });
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
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Re-fetch when app comes to foreground — clear ALL caches so admin changes
  // (banners, categories, products, icons, settings) are visible immediately
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearApiCache(); // wipes every cached endpoint — next fetch goes to server
        load();
      }
    });
    return () => sub.remove();
  }, [load]);

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
