'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lang, translations } from './i18n';

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('riderLang') : null;
    if (stored === 'ko' || stored === 'en') setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== 'undefined') localStorage.setItem('riderLang', l);
  }, []);

  return { lang, setLang, t: translations[lang] };
}
