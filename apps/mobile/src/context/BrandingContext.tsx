/**
 * BrandingContext — fetches APP_NAME, APP_LOGO, CURRENCY_SYMBOL once
 * from the public settings API and shares it across the whole app.
 * No more hardcoded "AM Mart" strings or logo assets.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { appSettingsApi } from '../services/api';

export interface Branding {
  appName: string;
  appLogo: string;       // Header logo URL — empty string when not set
  appIconLogo: string;   // App icon logo URL
  splashLogo: string;    // Splash screen logo URL
  splashBgColor: string; // Splash screen background color
  currency: string;
  loaded: boolean;
  reload: () => void;
}

const DEFAULT: Branding = {
  appName:      'AM Mart',
  appLogo:      '',
  appIconLogo:  '',
  splashLogo:   '',
  splashBgColor:'#10B981',
  currency:     '₩',
  loaded:       false,
  reload:       () => {},
};

const BrandingContext = createContext<Branding>(DEFAULT);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Omit<Branding, 'reload'>>({
    appName:      'AM Mart',
    appLogo:      '',
    appIconLogo:  '',
    splashLogo:   '',
    splashBgColor:'#10B981',
    currency:     '₩',
    loaded:       false,
  });
  const retryCount = React.useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await appSettingsApi.getPublic();
      const d = res.data;
      if (d) {
        retryCount.current = 0; // reset on success
        setBranding({
          appName:      d.APP_NAME       || 'AM Mart',
          appLogo:      d.APP_LOGO       || '',
          appIconLogo:  d.APP_ICON_LOGO  || '',
          splashLogo:   d.SPLASH_LOGO    || '',
          splashBgColor:d.SPLASH_BG_COLOR || '#10B981',
          currency:     d.CURRENCY_SYMBOL || d.CURRENCY || '₩',
          loaded:       true,
        });
        return;
      }
    } catch {}
    // Failed — mark loaded so UI doesn't block
    setBranding((b) => ({ ...b, loaded: true }));
    // Retry up to 5 times with increasing delay (4s, 8s, 16s, 30s, 30s)
    if (retryCount.current < 5) {
      const delay = Math.min(4000 * Math.pow(2, retryCount.current), 30000);
      retryCount.current += 1;
      setTimeout(load, delay);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <BrandingContext.Provider value={{ ...branding, reload: load }}>
      {children}
    </BrandingContext.Provider>
  );
}

/** Use anywhere in the app — zero hardcoded name/logo */
export function useBranding(): Branding {
  return useContext(BrandingContext);
}
