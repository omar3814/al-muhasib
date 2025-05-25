// src/components/layout/MainLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useTranslation } from 'react-i18next';


const MainLayout = () => {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen flex flex-col bg-navy-deep">
      <Navbar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
        <Outlet /> {/* Routed page components will render here */}
      </main>
      <footer className="bg-navy-light text-center py-4 text-xs text-text-secondary-dark mt-auto">
        © {new Date().getFullYear()} {t('appName')}. {t('tagline')}.
      </footer>
    </div>
  );
};

export default MainLayout;