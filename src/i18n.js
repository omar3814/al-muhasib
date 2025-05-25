// src/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// We will create these translation files in the next sub-step
import arTranslation from './locales/ar/common.json';
import enTranslation from './locales/en/common.json'; // For future English support

i18n
  // Detect user language
  // Learn more: https://github.com/i18next/i18next-browser-languageDetector
  .use(LanguageDetector)
  // Pass the i18n instance to react-i18next.
  .use(initReactI18next)
  // Initialize i18next
  // For all options read: https://www.i18next.com/overview/configuration-options
  .init({
    debug: import.meta.env.DEV, // Enable debug output in development environment
    fallbackLng: 'ar', // Fallback language if detected language or specific key is missing
    lng: 'ar', // Default language set to Arabic
    interpolation: {
      escapeValue: false, // Not needed for React as it escapes by default
    },
    resources: {
      ar: {
        common: arTranslation, // 'common' is our default namespace
      },
      en: {
        common: enTranslation,
      },
    },
    // Language detection options
    detection: {
      // Order and from where user language should be detected
      order: ['localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
      // Keys or params to lookup language from
      lookupLocalStorage: 'i18nextLng', // Cache language in localStorage under 'i18nextLng'
      // ... other detection options
      caches: ['localStorage'], // Cache the language in localStorage
    },
    // react-i18next specific options
    react: {
      useSuspense: true, // Recommended for better UX with Suspense
    }
  });

export default i18n;