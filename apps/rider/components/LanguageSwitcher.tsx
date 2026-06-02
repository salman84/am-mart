'use client';

import { Lang } from '../lib/i18n';

export function LanguageSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs font-semibold">
      <button
        onClick={() => setLang('en')}
        className={`px-2.5 py-1.5 rounded-md transition-colors ${
          lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ko')}
        className={`px-2.5 py-1.5 rounded-md transition-colors ${
          lang === 'ko' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        KO
      </button>
    </div>
  );
}
