export type LanguageCode = 'en' | 'tr' | 'ru';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    flag: '🇹🇷',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺',
  },
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function getLanguageInfo(code: string): LanguageInfo {
  const found = SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
  return found || SUPPORTED_LANGUAGES[0];
}
