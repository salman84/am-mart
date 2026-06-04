/**
 * i18n — 10-language translation system
 *
 * Supported: English, Korean, Chinese (Simplified), Nepali, Bengali,
 *            Vietnamese, Filipino (Tagalog), Indonesian, Thai, Hindi
 *
 * Features:
 *  • Device language auto-detection on first install
 *  • First-run language picker screen
 *  • Persistent language preference (AsyncStorage)
 *  • Searchable dropdown in profile (no arrow)
 *  • Every single UI string covered — no hardcoded text anywhere
 */
import React, {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import en from './translations/en';
import ko from './translations/ko';
import zh from './translations/zh';
import ne from './translations/ne';
import bn from './translations/bn';
import vi from './translations/vi';
import tl from './translations/tl';
import id from './translations/id';
import th from './translations/th';
import hi from './translations/hi';

// ── Language config ────────────────────────────────────────────────────────────
export type Language = 'en' | 'ko' | 'zh' | 'ne' | 'bn' | 'vi' | 'tl' | 'id' | 'th' | 'hi';

export interface LanguageOption {
  code: Language;
  name: string;       // native name shown in picker
  label: string;      // English label for search
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English',              label: 'English',    flag: '🇬🇧' },
  { code: 'ko', name: '한국어',               label: 'Korean',     flag: '🇰🇷' },
  { code: 'zh', name: '中文',                 label: 'Chinese',    flag: '🇨🇳' },
  { code: 'ne', name: 'नेपाली',              label: 'Nepali',     flag: '🇳🇵' },
  { code: 'bn', name: 'বাংলা',               label: 'Bengali',    flag: '🇧🇩' },
  { code: 'vi', name: 'Tiếng Việt',           label: 'Vietnamese', flag: '🇻🇳' },
  { code: 'tl', name: 'Filipino',             label: 'Filipino',   flag: '🇵🇭' },
  { code: 'id', name: 'Bahasa Indonesia',     label: 'Indonesian', flag: '🇮🇩' },
  { code: 'th', name: 'ภาษาไทย',             label: 'Thai',       flag: '🇹🇭' },
  { code: 'hi', name: 'हिन्दी',              label: 'Hindi',      flag: '🇮🇳' },
];

// ── Translation map ────────────────────────────────────────────────────────────
const translations: Record<Language, typeof en> = {
  en, ko, zh, ne, bn, vi, tl, id, th, hi,
};

export type TKey = keyof typeof en;

// ── Storage key ────────────────────────────────────────────────────────────────
const LANG_KEY = '@ammart_language';
const FIRST_RUN_KEY = '@ammart_first_run';

// ── Detect device language ─────────────────────────────────────────────────────
function detectDeviceLanguage(): Language {
  try {
    let tag = 'en';
    if (Platform.OS === 'ios') {
      tag = (
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'en'
      ).toLowerCase();
    } else {
      // Android
      tag = (NativeModules.I18nManager?.localeIdentifier || 'en').toLowerCase();
    }

    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('ne')) return 'ne';
    if (tag.startsWith('bn')) return 'bn';
    if (tag.startsWith('vi')) return 'vi';
    if (tag.startsWith('tl') || tag.startsWith('fil')) return 'tl';
    if (tag.startsWith('id')) return 'id';
    if (tag.startsWith('th')) return 'th';
    if (tag.startsWith('hi')) return 'hi';
  } catch {}
  return 'en';
}

// ── Context ────────────────────────────────────────────────────────────────────
interface LangCtx {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: TKey, params?: Record<string, string | number>) => string;
  isFirstRun: boolean;
  completeFirstRun: () => Promise<void>;
  loading: boolean;
}

const LanguageContext = createContext<LangCtx>({
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
  isFirstRun: false,
  completeFirstRun: async () => {},
  loading: true,
});

// ── Provider ───────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLangState] = useState<Language>('en');
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Use SecureStore as the reliable source of truth for "has user set up the app"
        // SecureStore IS cleared on uninstall (unlike AsyncStorage which can persist on Android)
        const secureFlag = await SecureStore.getItemAsync('ammart_lang_setup').catch(() => null);
        const savedLang = await AsyncStorage.getItem(LANG_KEY).catch(() => null);

        if (secureFlag && savedLang && translations[savedLang as Language]) {
          // User has completed language setup AND the flag survived in SecureStore
          setLangState(savedLang as Language);
          setIsFirstRun(false);
        } else {
          // Either first install, or reinstall (SecureStore was cleared), or never set up
          const detected = detectDeviceLanguage();
          setLangState(detected);
          setIsFirstRun(true);
        }
      } catch {
        setLangState('en');
        setIsFirstRun(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLangState(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
  }, []);

  const completeFirstRun = useCallback(async () => {
    setIsFirstRun(false);
    // Write to BOTH stores:
    // - SecureStore = cleared on uninstall (reliable for detecting fresh install)
    // - AsyncStorage = fast read for the language code
    await SecureStore.setItemAsync('ammart_lang_setup', 'done').catch(() => {});
    await AsyncStorage.setItem(FIRST_RUN_KEY, 'done').catch(() => {});
    await AsyncStorage.setItem(LANG_KEY, language).catch(() => {});
  }, [language]);

  const t = useCallback((key: TKey, params?: Record<string, string | number>): string => {
    const dict = translations[language] ?? translations.en;
    let text: string = (dict as any)[key] ?? (translations.en as any)[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isFirstRun, completeFirstRun, loading }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
