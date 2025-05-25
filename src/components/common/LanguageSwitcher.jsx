import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng, dir) => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
    document.documentElement.dir = dir;
    localStorage.setItem('userLanguage', lng); 
    localStorage.setItem('userLanguageDirection', dir);
  };

  useEffect(() => {
    const storedLang = localStorage.getItem('userLanguage');
    const storedDir = localStorage.getItem('userLanguageDirection');
    const currentLangObjFromI18n = languages.find(l => l.code === i18n.language);

    if (storedLang && storedDir) {
      if (storedLang !== i18n.language) {
        i18n.changeLanguage(storedLang);
      }
      document.documentElement.lang = storedLang;
      document.documentElement.dir = storedDir;
    } else if (currentLangObjFromI18n) { 
        document.documentElement.lang = currentLangObjFromI18n.code;
        document.documentElement.dir = currentLangObjFromI18n.dir;
    } else { 
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
        if(i18n.language !== 'ar') { // Ensure i18n state matches if we default
            i18n.changeLanguage('ar');
        }
    }
  }, [i18n, i18n.language]);


  return (
    <div className="flex items-center space-s-2 me-3">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code, lang.dir)}
          disabled={i18n.language === lang.code}
          className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors
                      ${i18n.language === lang.code 
                        ? 'bg-accent-blue text-white cursor-default' 
                        : 'bg-slate-blue text-text-secondary-dark hover:bg-opacity-80 hover:text-text-primary-dark'}`}
        >
          {lang.name}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;