'use client';
import { useState, useEffect, useCallback } from 'react';
import { Lang, getTranslations } from './i18n';

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('sellerLang') as Lang;
    if (saved === 'en' || saved === 'ko') setLangState(saved);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('sellerLang', l);
  }, []);

  const t = getTranslations(lang);
  return { lang, setLang, t };
}
