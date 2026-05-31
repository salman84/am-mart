/**
 * BrandingContext — fetches APP_NAME, APP_LOGO, CURRENCY_SYMBOL once
 * from the public settings API and shares it across the whole app.
 * No more hardcoded "AM Mart" strings or logo assets.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { appSettingsApi } from '../services/api';

export interface Branding {
  appName: string;
  appLogo: string;       // URL — empty string when not set
  currency: string;
  loaded: boolean;
  reload: () => void;
}

const DEFAULT: Branding = {
  appName:  'AM Mart',
  appLogo:  '',
  currency: '₩',
  loaded:   false,
  reload:   () => {},
};

const BrandingContext = createContext<Branding>(DEFAULT);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Omit<Branding, 'reload'>>({
    appName:  'AM Mart',
    appLogo:  '',
    currency: '₩',
    loaded:   false,
  });

  const load = useCallback(async () => {
    try {
      const res = await appSettingsApi.getPublic();
      const d = res.data;
      if (d) {
        setBranding({
          appName:  d.APP_NAME  || 'AM Mart',
          appLogo:  d.APP_LOGO  || '',
          currency: d.CURRENCY_SYMBOL || d.CURRENCY || '₩',
          loaded:   true,
        });
      }
    } catch {
      setBranding((b) => ({ ...b, loaded: true }));
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
