'use client';
import { Lang } from '../lib/i18n';

interface Props {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export function LanguageSwitcher({ lang, setLang }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
          lang === 'en' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ko')}
        className={`px-3 py-1 rounded-md text-sm font-semibold transition-all ${
          lang === 'ko' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        한국어
      </button>
    </div>
  );
}
